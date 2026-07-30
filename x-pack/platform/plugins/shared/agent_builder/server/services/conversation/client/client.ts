/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { OccWriter, isElasticsearchWriteConflict } from '@kbn/occ';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { ConversationOrigin, ConversationWithoutRounds } from '@kbn/agent-builder-common';
import {
  type UserIdAndName,
  type Conversation,
  createConversationNotFoundError,
  createConversationWriteConflictError,
  isAgentNotFoundError,
  isAgentUnavailableError,
  isConversationNotFoundError,
} from '@kbn/agent-builder-common';
import type { AgentRegistry } from '../../agents/agent_registry';
import {
  buildReadAccessFilter,
  hasConversationConverseAccess,
  hasConversationOwnerAccess,
  type ConversationAccess,
} from '../access_control';
import type {
  ConversationCreateRequest,
  ConversationUpdateRequest,
  ConversationListOptions,
  PersistRoundRequest,
} from './types';
import { createSpaceDslFilter } from '../../../utils/spaces';
import { isVersionConflictError } from '../../../utils/is_version_conflict_error';
import type { ConversationProperties, ConversationStorage } from './storage';
import { createStorage } from './storage';
import { mergeAttachmentsById, upsertRound } from './round_writes';
import {
  fromEs,
  fromEsWithoutRounds,
  toEs,
  createRequestToEs,
  updateConversation,
  type Document,
} from './converters';

/**
 * Conversation writes are appends against a document another client may be
 * writing to at the same time, so conflicts are expected rather than
 * exceptional. The re-read is a `search`, which is near-real-time, so a retry
 * can briefly still see the pre-conflict document — hence a longer delay and
 * more attempts than the `@kbn/occ` defaults.
 */
const OCC_MAX_RETRIES = 5;
const OCC_RETRY_DELAY_MS = 250;

export interface ConversationClient {
  get(conversationId: string): Promise<Conversation>;
  exists(conversationId: string): Promise<boolean>;
  getByOrigin(origin: ConversationOrigin): Promise<Conversation | undefined>;
  create(conversation: ConversationCreateRequest): Promise<Conversation>;
  update(
    conversation: ConversationUpdateRequest,
    options?: { access: ConversationAccess }
  ): Promise<Conversation>;
  persistRound(
    request: PersistRoundRequest,
    options?: { access: ConversationAccess }
  ): Promise<Conversation>;
  list(options?: ConversationListOptions): Promise<ConversationWithoutRounds[]>;
  delete(conversationId: string): Promise<boolean>;
}

export const createClient = ({
  space,
  logger,
  esClient,
  user,
  agentRegistry,
}: {
  space: string;
  logger: Logger;
  esClient: ElasticsearchClient;
  user: UserIdAndName;
  agentRegistry: AgentRegistry;
}): ConversationClient => {
  const storage = createStorage({ logger, esClient });
  return new ConversationClientImpl({ storage, user, space, agentRegistry, logger });
};

class ConversationClientImpl implements ConversationClient {
  private readonly space: string;
  private readonly storage: ConversationStorage;
  private readonly user: UserIdAndName;
  private readonly agentRegistry: AgentRegistry;
  private readonly logger: Logger;

  constructor({
    storage,
    user,
    space,
    agentRegistry,
    logger,
  }: {
    storage: ConversationStorage;
    user: UserIdAndName;
    space: string;
    agentRegistry: AgentRegistry;
    logger: Logger;
  }) {
    this.storage = storage;
    this.user = user;
    this.space = space;
    this.agentRegistry = agentRegistry;
    this.logger = logger;
  }

  async list(options: ConversationListOptions = {}): Promise<ConversationWithoutRounds[]> {
    const { agentId } = options;
    const accessibleAgentIds = await this.agentRegistry.getIds();

    if (accessibleAgentIds.length === 0 || (agentId && !accessibleAgentIds.includes(agentId))) {
      return [];
    }

    const agentIds = agentId ? [agentId] : accessibleAgentIds;

    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 1000,
      _source: [
        'agent_id',
        'user_id',
        'user_name',
        'title',
        'created_at',
        'updated_at',
        'status',
        'read',
        'access_control',
        'origin',
      ],
      query: {
        bool: {
          filter: [
            createSpaceDslFilter(this.space),
            buildReadAccessFilter({ user: this.user, agentIds }),
          ],
        },
      },
    });

    return response.hits.hits.map((hit) => fromEsWithoutRounds(hit as Document));
  }

  async get(conversationId: string): Promise<Conversation> {
    const document = await this.getDocumentWithAccess({ conversationId, access: 'converse' });

    return fromEs(document);
  }

  async exists(conversationId: string): Promise<boolean> {
    const document = await this._get(conversationId);

    return document !== undefined;
  }

  async getByOrigin(origin: ConversationOrigin): Promise<Conversation | undefined> {
    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 1,
      terminate_after: 1,
      query: {
        bool: {
          filter: [
            createSpaceDslFilter(this.space),
            { term: { 'origin.external_conversation_id': origin.external_conversation_id } },
          ],
        },
      },
    });

    const hit = response.hits.hits[0] as Document | undefined;
    if (!hit || !hit._id) {
      return undefined;
    }

    try {
      return fromEs(
        await this.getDocumentWithAccess({ conversationId: hit._id, access: 'converse' })
      );
    } catch (error) {
      if (isConversationNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
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

    try {
      await this.storage.getClient().index({
        id,
        document: attributes,
        op_type: 'create',
      });
    } catch (error) {
      if (isVersionConflictError(error)) {
        throw createConversationNotFoundError({ conversationId: id });
      }

      throw error;
    }

    return this.get(id);
  }

  async update(
    conversationUpdate: ConversationUpdateRequest,
    options: { access: ConversationAccess } = { access: 'owner' }
  ): Promise<Conversation> {
    const { id: conversationId } = conversationUpdate;
    const { access } = options;
    const now = new Date();
    const document = await this.getDocumentWithAccess({ conversationId, access });

    const storedConversation = fromEs(document);
    const updatedConversation = updateConversation({
      conversation: storedConversation,
      update: conversationUpdate,
      updateDate: now,
      space: this.space,
    });
    const attributes = toEs(updatedConversation, this.space);

    try {
      await this.storage.getClient().index({
        id: conversationUpdate.id,
        document: attributes,
        // use optimistic concurrency control to prevent concurrent update conflicts
        if_seq_no: document._seq_no,
        if_primary_term: document._primary_term,
      });
    } catch (error) {
      if (isElasticsearchWriteConflict(error)) {
        throw createConversationWriteConflictError({ conversationId });
      }

      throw error;
    }

    return updatedConversation;
  }

  /**
   * Persists a single round, merging it into the conversation as currently
   * stored rather than into the snapshot the caller started from.
   *
   * The mutator is replayed on every conflict retry, so it must stay free of
   * side effects beyond the document it returns.
   */
  async persistRound(
    request: PersistRoundRequest,
    options: { access: ConversationAccess } = { access: 'converse' }
  ): Promise<Conversation> {
    const {
      id: conversationId,
      round,
      replaces_round_id: replacesRoundId,
      state,
      status,
      attachments,
      workspace_id: workspaceId,
    } = request;
    const { access } = options;

    let updatedConversation: Conversation | undefined;

    try {
      await this.createOccWriter(access).readModifyWrite({
        id: conversationId,
        mutate: (source) => {
          const current = fromEs({ _id: conversationId, _source: source });

          updatedConversation = updateConversation({
            conversation: current,
            update: {
              id: conversationId,
              rounds: upsertRound(current.rounds, round, replacesRoundId),
              ...(status ? { status } : {}),
              ...(state ? { state } : {}),
              // Merged rather than assigned: the payload was seeded before the
              // agent ran, so assigning it would revert attachment changes made
              // since — and the retry would do so having just read them.
              ...(attachments
                ? { attachments: mergeAttachmentsById(current.attachments ?? [], attachments) }
                : {}),
              // Write-once, resolved against the stored conversation so two
              // concurrent first rounds cannot each mint a workspace.
              ...(workspaceId && !current.workspace_id ? { workspace_id: workspaceId } : {}),
              read: false,
              // `title` is deliberately absent. Titles are generated once, at
              // creation, so a round would only ever write back the title it
              // read — reverting any rename made while the agent was running.
            },
            updateDate: new Date(),
            space: this.space,
          });

          return toEs(updatedConversation, this.space);
        },
      });
    } catch (error) {
      // also true for the OccConflictError raised once retries are exhausted
      if (isElasticsearchWriteConflict(error)) {
        this.logger.error(
          `Failed to persist round ${round.id} of conversation ${conversationId}: concurrent writes could not be reconciled`
        );

        throw createConversationWriteConflictError({ conversationId });
      }

      throw error;
    }

    return updatedConversation!;
  }

  private createOccWriter(access: ConversationAccess): OccWriter<ConversationProperties> {
    return new OccWriter<ConversationProperties>({
      get: async (id) => {
        const document = await this.getDocumentWithAccess({ conversationId: id, access });

        return {
          id,
          source: document._source!,
          occ: { seqNo: document._seq_no!, primaryTerm: document._primary_term! },
        };
      },
      // `refresh` is left at the storage adapter's `wait_for` default so a retry's
      // re-read — a near-real-time search — can see the winning write.
      index: async ({ id, document, ifSeqNo, ifPrimaryTerm }) => {
        const response = await this.storage.getClient().index({
          id,
          document,
          ...(ifSeqNo != null && ifPrimaryTerm != null
            ? { if_seq_no: ifSeqNo, if_primary_term: ifPrimaryTerm }
            : {}),
        });

        return { seqNo: response._seq_no!, primaryTerm: response._primary_term! };
      },
      logger: this.logger,
      maxRetries: OCC_MAX_RETRIES,
      retryDelayMs: OCC_RETRY_DELAY_MS,
    });
  }

  async delete(conversationId: string): Promise<boolean> {
    await this.getDocumentWithAccess({ conversationId, access: 'owner' });

    try {
      const { result } = await this.storage.getClient().delete({ id: conversationId });
      return result === 'deleted';
    } catch (err) {
      if (err?.statusCode === 404) {
        return true;
      }
      throw err;
    }
  }

  private async _get(conversationId: string): Promise<Document | undefined> {
    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 1,
      terminate_after: 1,
      // Required for optimistic concurrency control: search omits these unless asked.
      seq_no_primary_term: true,
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

  /**
   * Fetches a conversation and applies the requested access gate. Converse access
   * requires current use access to the underlying agent even for conversation
   * owners; all denials are masked as not-found responses so callers cannot
   * distinguish inaccessible conversations.
   */
  private async getDocumentWithAccess({
    conversationId,
    access,
  }: {
    conversationId: string;
    access: ConversationAccess;
  }): Promise<Document> {
    const document = await this._get(conversationId);

    if (!document) {
      throw createConversationNotFoundError({ conversationId });
    }

    let allowed = false;
    const conversation = document._source!;

    switch (access) {
      case 'converse':
        allowed = hasConversationConverseAccess({ conversation, user: this.user });

        if (allowed) {
          try {
            await this.agentRegistry.get(conversation.agent_id, { access: 'use' });
          } catch (error) {
            if (
              !isAgentNotFoundError(error) &&
              !isAgentUnavailableError(error, conversation.agent_id)
            ) {
              throw error;
            }

            allowed = false;
          }
        }
        break;

      case 'owner':
        allowed = hasConversationOwnerAccess({ conversation, user: this.user });
        break;
    }

    if (!allowed) {
      throw createConversationNotFoundError({ conversationId });
    }

    return document;
  }
}
