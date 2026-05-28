/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { ConversationRound, ConversationWithoutRounds } from '@kbn/agent-builder-common';
import {
  type UserIdAndName,
  type Conversation,
  AgentBuilderErrorCode,
  ConversationRoundStatus,
  createAgentBuilderError,
  createBadRequestError,
  createConversationNotFoundError,
} from '@kbn/agent-builder-common';
import type {
  ConversationBulkDeleteFilter,
  ConversationBulkDeleteResult,
  ConversationCreateRequest,
  ConversationImportMode,
  ConversationImportRequest,
  ConversationListOptions,
  ConversationUpdateRequest,
} from './types';
import { createSpaceDslFilter } from '../../../utils/spaces';
import type { ConversationStorage } from './storage';
import { createStorage } from './storage';
import {
  fromEs,
  fromEsWithoutRounds,
  toEs,
  createRequestToEs,
  updateConversation,
  type Document,
} from './converters';

/** Hard cap on rounds per import call. Larger histories must be split across conversations. */
export const IMPORT_MAX_ROUNDS = 1000;
/** Hard cap on ids per bulk_delete call when using the explicit-ids branch. */
export const BULK_DELETE_MAX_IDS = 1000;

export interface ConversationClient {
  get(conversationId: string): Promise<Conversation>;
  exists(conversationId: string): Promise<boolean>;
  create(conversation: ConversationCreateRequest): Promise<Conversation>;
  update(conversation: ConversationUpdateRequest): Promise<Conversation>;
  list(options?: ConversationListOptions): Promise<ConversationWithoutRounds[]>;
  delete(conversationId: string): Promise<boolean>;
  /**
   * Import a conversation with caller-provided rounds.
   *
   * Faithfully writes the user/assistant transcript with `steps: []` and
   * zeroed timing/usage. No agent execution happens. See
   * {@link ConversationImportRequest}.
   */
  import(request: ConversationImportRequest): Promise<Conversation>;
  /**
   * Bulk delete conversations owned by the current user matching the filter.
   * See {@link ConversationBulkDeleteFilter}.
   */
  bulkDelete(filter: ConversationBulkDeleteFilter): Promise<ConversationBulkDeleteResult>;
}

export const createClient = ({
  space,
  logger,
  esClient,
  user,
}: {
  space: string;
  logger: Logger;
  esClient: ElasticsearchClient;
  user: UserIdAndName;
}): ConversationClient => {
  const storage = createStorage({ logger, esClient });
  return new ConversationClientImpl({ storage, user, space });
};

/**
 * Concrete client implementation, exported for unit tests.
 * @internal
 */
export class ConversationClientImpl implements ConversationClient {
  private readonly space: string;
  private readonly storage: ConversationStorage;
  private readonly user: UserIdAndName;

  constructor({
    storage,
    user,
    space,
  }: {
    storage: ConversationStorage;
    user: UserIdAndName;
    space: string;
  }) {
    this.storage = storage;
    this.user = user;
    this.space = space;
  }

  async list(options: ConversationListOptions = {}): Promise<ConversationWithoutRounds[]> {
    const { agentId } = options;

    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 1000,
      _source: ['agent_id', 'user_id', 'user_name', 'title', 'created_at', 'updated_at'],
      query: {
        bool: {
          filter: [createSpaceDslFilter(this.space)],
          must: [
            {
              term: { user_name: this.user.username },
            },
            ...(agentId ? [{ term: { agent_id: agentId } }] : []),
          ],
        },
      },
    });

    return response.hits.hits.map((hit) => fromEsWithoutRounds(hit as Document));
  }

  async get(conversationId: string): Promise<Conversation> {
    const document = await this._get(conversationId);
    if (!document) {
      throw createConversationNotFoundError({ conversationId });
    }

    if (!hasAccess({ conversation: document, user: this.user })) {
      throw createConversationNotFoundError({ conversationId });
    }

    return fromEs(document);
  }

  async exists(conversationId: string): Promise<boolean> {
    const document = await this._get(conversationId);
    if (!document) {
      return false;
    }
    return hasAccess({ conversation: document, user: this.user });
  }

  async create(conversation: ConversationCreateRequest): Promise<Conversation> {
    const now = new Date();
    const id = conversation.id ?? uuidv4();

    const attributes = createRequestToEs({
      conversation,
      currentUser: this.user,
      creationDate: now,
      space: this.space,
    });

    await this.storage.getClient().index({
      id,
      document: attributes,
    });

    return this.get(id);
  }

  async update(conversationUpdate: ConversationUpdateRequest): Promise<Conversation> {
    const { id: conversationId } = conversationUpdate;
    const now = new Date();
    const document = await this._get(conversationUpdate.id);
    if (!document) {
      throw createConversationNotFoundError({ conversationId });
    }

    if (!hasAccess({ conversation: document, user: this.user })) {
      throw createConversationNotFoundError({ conversationId });
    }

    const storedConversation = fromEs(document);
    const updatedConversation = updateConversation({
      conversation: storedConversation,
      update: conversationUpdate,
      updateDate: now,
      space: this.space,
    });
    const attributes = toEs(updatedConversation, this.space);

    await this.storage.getClient().index({
      id: conversationUpdate.id,
      document: attributes,
      // use optimistic concurrency control to prevent concurrent update conflicts
      if_seq_no: document._seq_no,
      if_primary_term: document._primary_term,
    });

    return this.get(conversationUpdate.id);
  }

  async delete(conversationId: string): Promise<boolean> {
    const document = await this._get(conversationId);
    if (!document) {
      throw createConversationNotFoundError({ conversationId });
    }

    if (!hasAccess({ conversation: document, user: this.user })) {
      throw createConversationNotFoundError({ conversationId });
    }

    const { result } = await this.storage.getClient().delete({ id: conversationId });
    return result === 'deleted';
  }

  async import(request: ConversationImportRequest): Promise<Conversation> {
    const mode: ConversationImportMode = request.mode ?? 'create';

    if (!request.rounds || request.rounds.length === 0) {
      throw createBadRequestError('At least one round is required to import a conversation.');
    }
    if (request.rounds.length > IMPORT_MAX_ROUNDS) {
      throw createBadRequestError(
        `Too many rounds (${request.rounds.length}); maximum is ${IMPORT_MAX_ROUNDS}. Split the history across multiple conversations.`
      );
    }

    request.rounds.forEach((round, idx) => {
      if (typeof round.user_message !== 'string' || round.user_message.length === 0) {
        throw createBadRequestError(`rounds[${idx}].user_message must be a non-empty string.`);
      }
      if (typeof round.assistant_message !== 'string' || round.assistant_message.length === 0) {
        throw createBadRequestError(`rounds[${idx}].assistant_message must be a non-empty string.`);
      }
      if (round.started_at !== undefined) {
        const ts = Date.parse(round.started_at);
        if (Number.isNaN(ts)) {
          throw createBadRequestError(`rounds[${idx}].started_at is not a valid ISO timestamp.`);
        }
      }
    });

    if (request.id) {
      const existing = await this._get(request.id);
      if (existing) {
        const owned = hasAccess({ conversation: existing, user: this.user });
        if (!owned) {
          throw createAgentBuilderError(
            AgentBuilderErrorCode.badRequest,
            `Conversation ${request.id} already exists in this space but is owned by another user.`,
            { conversationId: request.id, statusCode: 403 }
          );
        }
        if (mode === 'create') {
          throw createAgentBuilderError(
            AgentBuilderErrorCode.badRequest,
            `Conversation ${request.id} already exists. Use mode "overwrite" to replace it.`,
            { conversationId: request.id, statusCode: 409 }
          );
        }
      }
    }

    const nowIso = new Date().toISOString();
    const importedRounds: ConversationRound[] = request.rounds.map((r) => ({
      id: uuidv4(),
      status: ConversationRoundStatus.completed,
      input: { message: r.user_message },
      response: { message: r.assistant_message },
      steps: [],
      started_at: r.started_at ?? nowIso,
      time_to_first_token: 0,
      time_to_last_token: 0,
      model_usage: {
        connector_id: 'imported',
        llm_calls: 0,
        input_tokens: 0,
        output_tokens: 0,
      },
    }));

    const title = request.title?.trim() || buildImportedTitle(request.rounds[0].user_message);

    return this.create({
      id: request.id,
      agent_id: request.agent_id,
      title,
      rounds: importedRounds,
    });
  }

  async bulkDelete(filter: ConversationBulkDeleteFilter): Promise<ConversationBulkDeleteResult> {
    const {
      conversation_ids: conversationIds,
      agent_id: agentId,
      created_after: createdAfter,
      created_before: createdBefore,
      dry_run: dryRun,
    } = filter;

    if (
      (!conversationIds || conversationIds.length === 0) &&
      !agentId &&
      !createdAfter &&
      !createdBefore
    ) {
      throw createBadRequestError(
        'bulkDelete requires at least one of: conversation_ids, agent_id, created_after, created_before.'
      );
    }

    if (conversationIds && conversationIds.length > BULK_DELETE_MAX_IDS) {
      throw createBadRequestError(
        `conversation_ids exceeds maximum of ${BULK_DELETE_MAX_IDS} per call.`
      );
    }

    if (createdAfter !== undefined && Number.isNaN(Date.parse(createdAfter))) {
      throw createBadRequestError(`created_after is not a valid ISO timestamp.`);
    }
    if (createdBefore !== undefined && Number.isNaN(Date.parse(createdBefore))) {
      throw createBadRequestError(`created_before is not a valid ISO timestamp.`);
    }

    const filters: QueryDslQueryContainer[] = [
      createSpaceDslFilter(this.space),
      { term: { user_name: this.user.username } },
    ];
    if (conversationIds && conversationIds.length > 0) {
      filters.push({ terms: { _id: conversationIds } });
    }
    if (agentId) {
      filters.push({ term: { agent_id: agentId } });
    }
    if (createdAfter || createdBefore) {
      filters.push({
        range: {
          created_at: {
            ...(createdAfter ? { gte: createdAfter } : {}),
            ...(createdBefore ? { lte: createdBefore } : {}),
          },
        },
      });
    }

    const query = { bool: { filter: filters } };

    const countResp = await this.storage.getClient().search({
      track_total_hits: true,
      size: 0,
      query,
    });
    const matched = readTotal(countResp.hits.total);

    let notFound: string[] = [];
    if (conversationIds && conversationIds.length > 0) {
      const idHits = await this.storage.getClient().search({
        track_total_hits: false,
        size: conversationIds.length,
        _source: false,
        query,
      });
      const foundIds = new Set(idHits.hits.hits.map((h) => h._id));
      notFound = conversationIds.filter((id) => !foundIds.has(id));
    }

    if (dryRun) {
      return { deleted: 0, matched, not_found: notFound };
    }

    let deleted = 0;
    const pageSize = 1000;
    // Paginate by repeated search after delete; each delete waits for refresh so
    // the next search sees no overlap. Capped at matched to avoid runaway loops.
    let remaining = matched;
    while (remaining > 0) {
      const page = await this.storage.getClient().search({
        track_total_hits: false,
        size: pageSize,
        _source: false,
        query,
      });
      const hits = page.hits.hits;
      if (hits.length === 0) {
        break;
      }
      const deletions = await Promise.all(
        hits.map(async (hit) => {
          const res = await this.storage.getClient().delete({ id: hit._id! });
          return res.result === 'deleted';
        })
      );
      const pageDeleted = deletions.filter(Boolean).length;
      deleted += pageDeleted;
      remaining -= hits.length;
      if (pageDeleted === 0) {
        // Defensive: if nothing was deleted in this page (e.g. concurrent
        // delete) and the page is full, break to avoid an infinite loop.
        break;
      }
    }

    return { deleted, matched, not_found: notFound };
  }

  private async _get(conversationId: string): Promise<Document | undefined> {
    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 1,
      terminate_after: 1,
      query: {
        bool: {
          filter: [createSpaceDslFilter(this.space), { term: { _id: conversationId } }],
        },
      },
    });
    if (response.hits.hits.length === 0) {
      return undefined;
    } else {
      return response.hits.hits[0] as Document;
    }
  }
}

const hasAccess = ({
  conversation,
  user,
}: {
  conversation: Pick<Document, '_source'>;
  user: UserIdAndName;
}) => {
  if (user.id && conversation._source!.user_id === user.id) {
    return true;
  }
  return conversation._source!.user_name === user.username;
};

const IMPORT_TITLE_MAX_LEN = 80;

/**
 * Builds a default title for imported conversations derived from the first
 * user message. Falls back to a stable placeholder when the message is empty.
 */
const buildImportedTitle = (firstMessage: string): string => {
  const trimmed = firstMessage.replace(/\s+/g, ' ').trim();
  if (!trimmed) {
    return 'Imported conversation';
  }
  if (trimmed.length <= IMPORT_TITLE_MAX_LEN) {
    return trimmed;
  }
  return `${trimmed.slice(0, IMPORT_TITLE_MAX_LEN - 1)}\u2026`;
};

const readTotal = (total: unknown): number => {
  if (typeof total === 'number') {
    return total;
  }
  if (total && typeof total === 'object' && 'value' in total) {
    return Number((total as { value: number }).value) || 0;
  }
  return 0;
};
