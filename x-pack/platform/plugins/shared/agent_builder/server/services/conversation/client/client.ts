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
  createInternalError,
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
import type { ConversationStorage } from './storage';
import { createStorage } from './storage';
import { reconcileAttachments, upsertRound } from './round_writes';
import {
  fromEs,
  fromEsWithoutRounds,
  toEs,
  createRequestToEs,
  updateConversation,
  type Document,
  type VersionedDocument,
} from './converters';

const OCC_MAX_RETRIES = 5;
const OCC_RETRY_DELAY_MS = 400;

export interface ConversationClient {
  get(conversationId: string): Promise<Conversation>;
  exists(conversationId: string): Promise<boolean>;
  getByOrigin(origin: ConversationOrigin): Promise<Conversation | undefined>;
  create(conversation: ConversationCreateRequest): Promise<Conversation>;
  update(
    conversation: ConversationUpdateRequest,
    options?: { access: ConversationAccess; retryOnConflict?: boolean }
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
        'pinned',
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
    const document = await this.getDocument(conversationId);

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

  /**
   * Applies the requested fields on top of the stored conversation.
   *
   * Only set `retryOnConflict` for values independent of previously-read state,
   * such as request scalars — re-applying an array built from a stale read would
   * revert the change it just read.
   */
  async update(
    conversationUpdate: ConversationUpdateRequest,
    options: { access: ConversationAccess; retryOnConflict?: boolean } = { access: 'owner' }
  ): Promise<Conversation> {
    const { id: conversationId } = conversationUpdate;
    const { access, retryOnConflict = false } = options;

    try {
      return await this.writeWithOcc({
        conversationId,
        access,
        maxRetries: retryOnConflict ? OCC_MAX_RETRIES : 0,
        mutate: (current) =>
          updateConversation({
            conversation: current,
            update: conversationUpdate,
            updateDate: new Date(),
            space: this.space,
          }),
      });
    } catch (error) {
      if (isElasticsearchWriteConflict(error)) {
        throw createConversationWriteConflictError({ conversationId });
      }

      throw error;
    }
  }

  /** Merges a round into the conversation as stored, not into the caller's snapshot. */
  async persistRound(
    request: PersistRoundRequest,
    options: { access: ConversationAccess } = { access: 'converse' }
  ): Promise<Conversation> {
    const { id: conversationId, round, replacesRoundId, state, attachments, workspaceId } = request;
    const { access } = options;

    try {
      return await this.writeWithOcc({
        conversationId,
        access,
        mutate: (current) =>
          updateConversation({
            conversation: current,
            update: {
              id: conversationId,
              rounds: upsertRound(current.rounds, round, replacesRoundId),
              status: round.status,
              ...(state ? { state } : {}),
              ...(attachments
                ? {
                    attachments: reconcileAttachments({
                      snapshot: attachments.snapshot,
                      stored: current.attachments ?? [],
                      produced: attachments.produced,
                    }),
                  }
                : {}),
              // write-once, against stored state so concurrent first rounds agree
              ...(workspaceId && !current.workspace_id ? { workspace_id: workspaceId } : {}),
              read: false,
              // `title` is deliberately absent: generated once at creation, so a
              // round would only write back the title it read, undoing a rename
            },
            updateDate: new Date(),
            space: this.space,
          }),
      });
    } catch (error) {
      // also true for the OccConflictError raised once retries are exhausted
      if (isElasticsearchWriteConflict(error)) {
        // logged here: mid-stream errors reach the client as SSE, not via wrap_handler
        this.logger.error(
          `Failed to persist round ${round.id} of conversation ${conversationId}: concurrent writes could not be reconciled`
        );

        throw createConversationWriteConflictError({ conversationId });
      }

      throw error;
    }
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

  private async getDocument(conversationId: string): Promise<VersionedDocument | undefined> {
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

    const hit = response.hits.hits[0];

    if (!hit) {
      return undefined;
    }

    const { _seq_no: seqNo, _primary_term: primaryTerm } = hit;

    if (seqNo === undefined || primaryTerm === undefined) {
      throw createInternalError(`Conversation ${conversationId} was read without version metadata`);
    }

    return { ...(hit as Document), _seq_no: seqNo, _primary_term: primaryTerm };
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
  }): Promise<VersionedDocument> {
    const document = await this.getDocument(conversationId);

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

  /**
   * Read-modify-write against the stored conversation, retrying on conflict.
   * `mutate` is replayed per attempt, so it must be free of side effects.
   */
  private async writeWithOcc({
    conversationId,
    access,
    mutate,
    maxRetries = OCC_MAX_RETRIES,
  }: {
    conversationId: string;
    access: ConversationAccess;
    mutate: (current: Conversation) => Conversation;
    maxRetries?: number;
  }): Promise<Conversation> {
    const writer = new OccWriter<Conversation>({
      get: async (id) => {
        const document = await this.getDocumentWithAccess({ conversationId: id, access });

        return {
          id,
          source: fromEs(document),
          occ: { seqNo: document._seq_no, primaryTerm: document._primary_term },
        };
      },
      index: async ({ id, document, ifSeqNo, ifPrimaryTerm }) => {
        const response = await this.storage.getClient().index({
          id,
          document: toEs(document, this.space),
          ...(ifSeqNo != null && ifPrimaryTerm != null
            ? { if_seq_no: ifSeqNo, if_primary_term: ifPrimaryTerm }
            : {}),
        });

        return { seqNo: response._seq_no!, primaryTerm: response._primary_term! };
      },
      logger: this.logger,
      maxRetries,
      retryDelayMs: OCC_RETRY_DELAY_MS,
    });

    const { document } = await writer.readModifyWrite({ id: conversationId, mutate });

    return document;
  }
}
