/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { OccWriter, isElasticsearchWriteConflict } from '@kbn/occ';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { ConversationOrigin } from '@kbn/agent-builder-common';
import {
  type CurrentUser,
  type Conversation,
  type ConversationAccessControl,
  type ConversationAccessControlEntry,
  CONVERSATION_ACCESS_CONTROL_MAX_ENTRIES,
  CONVERSATION_ACCESS_CONTROL_PRINCIPAL_ID_MAX_LENGTH,
  CONVERSATION_TITLE_MAX_LENGTH,
  ConversationAccessControlMode,
  isConversationAccessControlRole,
  normalizeConversationAccessControl,
  createBadRequestError,
  createConversationAlreadyExistsError,
  createConversationNotFoundError,
  createConversationWriteConflictError,
  createInternalError,
  isAgentNotFoundError,
  isAgentUnavailableError,
  isConversationNotFoundError,
} from '@kbn/agent-builder-common';
import type {
  ConversationTemplate,
  SerializedMetadataValue,
  MetadataFieldValue,
} from '@kbn/agent-builder-common';
import type {
  ConversationWithPermissions,
  ConversationWithoutRoundsWithPermissions,
  UpdateConversationAccessControlRequestBody,
} from '../../../../common/http_api/conversations';
import type { AgentRegistry } from '../../agents/agent_registry';
import {
  buildReadAccessFilter,
  hasConversationConverseAccess,
  hasConversationDeleteAccess,
  hasConversationOwnerAccess,
  hasConversationRenameAccess,
  hasConversationUpdateAccessControlAccess,
  type ConversationAccess,
} from '../access_control';
import type {
  AddAttachmentsToLastRoundRequest,
  ConversationCreateRequest,
  ConversationUpdatableFields,
  ConversationUpdateRequest,
  ConversationListOptions,
  UpsertRoundRequest,
} from './types';
import { createSpaceDslFilter } from '../../../utils/spaces';
import { isVersionConflictError } from '../../../utils/is_version_conflict_error';
import type { ConversationStorage } from './storage';
import { createStorage } from './storage';
import { getTemplate } from '../templates/registry';
import { validateTemplateDefaults, validateMetadataUpdate } from '../templates/validation';
import { serializeMetadataValue, deserializeMetadata } from '../templates/serialize';
import { reconcileAttachments, upsertRound as upsertRoundInList } from './round_writes';
import { applyAttachmentRefsToRounds } from './migrate_attachments';
import {
  fromEs,
  fromEsWithoutRounds,
  toEs,
  createRequestToEs,
  updateConversation,
  withPermissions,
  type Document,
} from './converters';
import { roundsToEvents } from './rounds_to_events';
import { eventsToRounds } from './events_to_rounds';

/** Applies `deserializeMetadata` to a conversation that has a `template_id` and `metadata`. */
const withDeserializedMetadata = <T extends { template_id?: string; metadata?: unknown }>(
  conversation: T
): T => {
  if (!conversation.template_id || !conversation.metadata) return conversation;
  const template = getTemplate(conversation.template_id);
  if (!template) return conversation;
  return {
    ...conversation,
    metadata: deserializeMetadata(
      conversation.metadata as Record<string, SerializedMetadataValue>,
      template
    ),
  };
};

const buildMetadataFromTemplate = (
  template: ConversationTemplate
): Record<string, SerializedMetadataValue> =>
  Object.entries(template.fields).reduce<Record<string, SerializedMetadataValue>>(
    (acc, [fieldName, def]) => {
      if (def.default_value !== undefined) {
        acc[fieldName] = serializeMetadataValue(def.default_value, def.input_type);
      }
      return acc;
    },
    {}
  );

/**
 * Read-path round-trip verification. When on, a conversation's rounds are replaced by
 * `eventsToRounds(roundsToEvents(...))` so every test suite that reads a conversation asserts the
 * rounds<->events conversion is an identity — a fidelity regression fails CI. Applied at the
 * response boundary only (never `fromEs`, which also feeds the OCC write path), so writes always
 * persist the real rounds.
 *
 * On automatically in CI (every suite that reads a conversation exercises it), and opt-in locally
 * via `CI=true`. Always OFF in production: a deployed Kibana never sets
 * `CI`, so real reads return the stored rounds untouched.
 */
const shouldVerifyRoundTrip = process.env.CI === 'true';

const verifyRoundTrip = (conversation: Conversation): Conversation =>
  shouldVerifyRoundTrip
    ? {
        ...conversation,
        rounds: eventsToRounds(roundsToEvents(conversation)),
      }
    : conversation;

export interface ConversationClient {
  get(conversationId: string): Promise<ConversationWithPermissions>;
  exists(conversationId: string): Promise<boolean>;
  getByOrigin(origin: ConversationOrigin): Promise<Conversation | undefined>;
  create(conversation: ConversationCreateRequest): Promise<ConversationWithPermissions>;
  update(
    conversation: ConversationUpdateRequest,
    options?: { access: ConversationAccess; retryOnConflict?: boolean }
  ): Promise<Conversation>;
  addAttachmentsToLastRound(
    request: AddAttachmentsToLastRoundRequest,
    options?: { access: ConversationAccess }
  ): Promise<Conversation>;
  upsertRound(
    request: UpsertRoundRequest,
    options?: { access: ConversationAccess }
  ): Promise<Conversation>;
  list(options?: ConversationListOptions): Promise<ConversationWithoutRoundsWithPermissions[]>;
  delete(conversationId: string): Promise<boolean>;
  updateAccessControl(
    conversationId: string,
    update: UpdateConversationAccessControlRequestBody
  ): Promise<ConversationAccessControl>;
  applyTemplate(conversationId: string, templateId: string): Promise<Conversation>;
  patchMetadata(conversationId: string, updates: Record<string, unknown>): Promise<Conversation>;
}

/**
 * Caps `title` at the stored bound. HTTP routes already validate it, but server-side callers
 * (LLM title generation in particular) do not, so enforce it here to cover every write path.
 */
const withBoundedTitle = <T extends { title?: string }>(fields: T): T =>
  fields.title === undefined
    ? fields
    : { ...fields, title: fields.title.slice(0, CONVERSATION_TITLE_MAX_LENGTH) };

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
  user: CurrentUser;
  agentRegistry: AgentRegistry;
}): ConversationClient => {
  const storage = createStorage({ logger, esClient });
  return new ConversationClientImpl({
    storage,
    user,
    space,
    agentRegistry,
    logger,
  });
};

class ConversationClientImpl implements ConversationClient {
  private readonly space: string;
  private readonly storage: ConversationStorage;
  private readonly user: CurrentUser;
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
    user: CurrentUser;
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

  async list(
    options: ConversationListOptions = {}
  ): Promise<ConversationWithoutRoundsWithPermissions[]> {
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
        'read_only',
        'access_control',
        'origin',
        'workspace_id',
        'template_id',
        'template_version',
        'metadata',
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

    return response.hits.hits.map((hit) =>
      this.toResponseConversationWithoutRounds(hit as Document)
    );
  }

  async get(conversationId: string): Promise<ConversationWithPermissions> {
    const document = await this.getDocumentWithAccess({ conversationId, access: 'converse' });

    return this.toResponseConversation(document);
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
      return withDeserializedMetadata(
        verifyRoundTrip(
          fromEs(await this.getDocumentWithAccess({ conversationId: hit._id, access: 'converse' }))
        )
      );
    } catch (error) {
      if (isConversationNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  }

  async create(conversation: ConversationCreateRequest): Promise<ConversationWithPermissions> {
    const now = new Date();
    const id = conversation.id ?? uuidv4();

    const { template_id: templateId, ...conversationWithoutTemplateId } = conversation;

    let resolvedMetadata = conversationWithoutTemplateId.metadata;
    let resolvedTemplateId: string | undefined;
    let resolvedTemplateVersion: number | undefined;
    if (templateId) {
      const template = getTemplate(templateId);
      if (!template) {
        throw createBadRequestError(`Template not found: ${templateId}`);
      }
      validateTemplateDefaults(template);
      // Validate any caller-supplied metadata against the template before merging.
      if (resolvedMetadata && Object.keys(resolvedMetadata).length > 0) {
        validateMetadataUpdate(template.id, template.fields, resolvedMetadata);
      }
      const templateMetadata = buildMetadataFromTemplate(template);
      // Serialize caller-supplied values to string/string[] before merging, just as
      // buildMetadataFromTemplate and patchMetadata do. Without this, a caller passing
      // e.g. { recipients_notified: true } (TOGGLE) writes a raw boolean into the
      // flattened field; deserializeMetadataValue then reads `true === 'true'` → false.
      const serializedCallerMetadata = Object.fromEntries(
        Object.entries(resolvedMetadata ?? {}).map(([key, value]) => {
          const def = template.fields[key];
          return [
            key,
            def ? serializeMetadataValue(value as MetadataFieldValue, def.input_type) : value,
          ];
        })
      );
      resolvedMetadata = { ...templateMetadata, ...serializedCallerMetadata };
      resolvedTemplateId = templateId;
      resolvedTemplateVersion = template.version;
    }

    const normalizedAccessControl = conversationWithoutTemplateId.access_control
      ? {
          access_mode: conversationWithoutTemplateId.access_control.access_mode,
          entries: validateAccessControlEntries({
            entries: conversationWithoutTemplateId.access_control.entries,
            ownerId: this.user.id,
            addedAtById: new Map(),
          }),
        }
      : undefined;

    const attributes = createRequestToEs({
      conversation: {
        ...withBoundedTitle(conversationWithoutTemplateId),
        access_control: normalizedAccessControl,
        metadata: resolvedMetadata,
        ...(resolvedTemplateId ? { template_id: resolvedTemplateId } : {}),
        ...(resolvedTemplateVersion !== undefined
          ? { template_version: resolvedTemplateVersion }
          : {}),
      },
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
        throw createConversationAlreadyExistsError({ conversationId: id });
      }

      throw error;
    }

    return this.get(id);
  }

  async update(
    conversationUpdate: ConversationUpdateRequest,
    options: { access: ConversationAccess; retryOnConflict?: boolean } = { access: 'owner' }
  ): Promise<Conversation> {
    const { id: conversationId, ...fields } = conversationUpdate;
    const { access, retryOnConflict = false } = options;

    const result = await this.writeConversation({
      conversationId,
      access,
      ...(retryOnConflict ? {} : { maxRetries: 0 }),
      fields: () => withBoundedTitle(fields),
    });

    return withDeserializedMetadata(result);
  }

  async addAttachmentsToLastRound(
    request: AddAttachmentsToLastRoundRequest,
    options: { access: ConversationAccess } = { access: 'owner' }
  ): Promise<Conversation> {
    const { id: conversationId, refs, attachments } = request;
    const { access } = options;

    const result = await this.writeConversation({
      conversationId,
      access,
      fields: (current) => {
        if (current.rounds.length === 0) {
          throw createBadRequestError(`Conversation ${conversationId} has no rounds to attach to`);
        }

        return {
          rounds: applyAttachmentRefsToRounds(
            current.rounds,
            new Map([[current.rounds.length - 1, refs]])
          ),
          attachments: reconcileAttachments({
            snapshot: attachments.snapshot,
            stored: current.attachments ?? [],
            produced: attachments.produced,
          }),
        };
      },
    });
    return withDeserializedMetadata(result);
  }

  async upsertRound(
    request: UpsertRoundRequest,
    options: { access: ConversationAccess } = { access: 'converse' }
  ): Promise<Conversation> {
    const { id: conversationId, round, replacesRoundId, state, attachments, workspaceId } = request;
    const { access } = options;

    const result = await this.writeConversation({
      conversationId,
      access,
      fields: (current) => ({
        rounds: upsertRoundInList(current.rounds, round, replacesRoundId),
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
        ...(workspaceId && !current.workspace_id ? { workspace_id: workspaceId } : {}),
        read: false,
      }),
    });
    return withDeserializedMetadata(result);
  }

  async delete(conversationId: string): Promise<boolean> {
    await this.getDocumentWithAccess({ conversationId, access: 'delete' });

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

  async updateAccessControl(
    conversationId: string,
    update: UpdateConversationAccessControlRequestBody
  ): Promise<ConversationAccessControl> {
    const conversation = await this.writeConversation({
      conversationId,
      access: 'updateAccessControl',
      fields: (current) => ({
        access_control: this.buildAccessControlUpdate({ current, update }),
      }),
    });

    return normalizeConversationAccessControl(conversation.access_control);
  }

  async applyTemplate(conversationId: string, templateId: string): Promise<Conversation> {
    const template = getTemplate(templateId);
    if (!template) {
      throw createBadRequestError(`Template not found: ${templateId}`);
    }

    validateTemplateDefaults(template);
    const newTemplateFieldNames = new Set(Object.keys(template.fields));
    const newTemplateMetadata = buildMetadataFromTemplate(template);

    const result = await this.writeConversation({
      conversationId,
      access: 'owner',
      fields: (current) => {
        // Reject switching to a different template — one template per conversation.
        // Re-applying the same template is the explicit version-migration action.
        if (current.template_id && current.template_id !== templateId) {
          throw createBadRequestError(
            `Conversation already has template "${current.template_id}". ` +
              `Switching templates is not supported; re-apply the same template to migrate to a newer version.`
          );
        }

        // Version bump (or first apply): preserve existing values for fields still
        // declared in the new version, seed defaults for newly added fields, and drop
        // everything else (fields the new version removed).
        const storedMetadata = (current.metadata ?? {}) as Record<string, SerializedMetadataValue>;
        const preservedValues = Object.fromEntries(
          Object.entries(storedMetadata).filter(([key]) => newTemplateFieldNames.has(key))
        );
        return {
          metadata: { ...newTemplateMetadata, ...preservedValues },
          template_id: templateId,
          template_version: template.version,
        };
      },
    });

    return withDeserializedMetadata(result);
  }

  async patchMetadata(
    conversationId: string,
    updates: Record<string, unknown>
  ): Promise<Conversation> {
    const result = await this.writeConversation({
      conversationId,
      access: 'owner',
      fields: (current) => {
        if (!current.template_id) {
          throw createBadRequestError(
            `Conversation "${conversationId}" has no template — apply a template before writing metadata`
          );
        }

        const template = getTemplate(current.template_id);
        if (!template) {
          throw createBadRequestError(
            `Template "${current.template_id}" referenced by this conversation was not found`
          );
        }

        // validateMetadataUpdate throws with accumulated per-field errors if any key is invalid.
        validateMetadataUpdate(template.id, template.fields, updates);

        const serialized = Object.fromEntries(
          Object.entries(updates).map(([k, v]) => {
            const def = template.fields[k];
            return [k, serializeMetadataValue(v as MetadataFieldValue, def.input_type)];
          })
        );

        const storedMetadata = (current.metadata ?? {}) as Record<string, SerializedMetadataValue>;
        return { metadata: { ...storedMetadata, ...serialized } };
      },
    });

    return withDeserializedMetadata(result);
  }

  private toResponseConversation(document: Document): ConversationWithPermissions {
    return withDeserializedMetadata(
      withPermissions({ conversation: verifyRoundTrip(fromEs(document)), user: this.user })
    );
  }

  private toResponseConversationWithoutRounds(
    document: Document
  ): ConversationWithoutRoundsWithPermissions {
    return withDeserializedMetadata(
      withPermissions({ conversation: fromEsWithoutRounds(document), user: this.user })
    );
  }

  private async getDocument(conversationId: string): Promise<Document | undefined> {
    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 1,
      terminate_after: 1,
      seq_no_primary_term: true,
      query: {
        bool: {
          filter: [createSpaceDslFilter(this.space), { term: { _id: conversationId } }],
        },
      },
    });

    const hit = response.hits.hits[0];

    if (!hit || !hit._id || !hit._source) {
      return undefined;
    }

    if (hit._seq_no === undefined || hit._primary_term === undefined) {
      throw createInternalError(`Conversation ${conversationId} was read without version metadata`);
    }

    return hit as Document;
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
    const document = await this.getDocument(conversationId);

    if (!document) {
      throw createConversationNotFoundError({ conversationId });
    }

    let allowed = false;
    const conversation = fromEsWithoutRounds(document);

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

      case 'rename':
        allowed = hasConversationRenameAccess({ conversation, user: this.user });
        break;

      case 'delete':
        allowed = hasConversationDeleteAccess({ conversation, user: this.user });
        break;

      case 'updateAccessControl':
        allowed = hasConversationUpdateAccessControlAccess({ conversation, user: this.user });
        break;
    }

    if (!allowed) {
      throw createConversationNotFoundError({ conversationId });
    }

    return document;
  }

  /**
   * Read-modify-write against the stored conversation, retrying on conflict.
   * `fields` is replayed per attempt against the freshly read conversation, so it must be free of side effects.
   */
  private async writeConversation({
    conversationId,
    access,
    fields,
    maxRetries = 5,
  }: {
    conversationId: string;
    access: ConversationAccess;
    fields: (current: Conversation) => Omit<ConversationUpdatableFields, 'id'>;
    maxRetries?: number;
  }): Promise<Conversation> {
    const writer = this.createWriter({ access, maxRetries });

    try {
      const { document } = await writer.readModifyWrite({
        id: conversationId,
        mutate: (current) =>
          updateConversation({
            conversation: current,
            update: { id: conversationId, ...fields(current) },
            updateDate: new Date(),
            space: this.space,
          }),
      });

      return document;
    } catch (error) {
      // retries are exhausted
      if (isElasticsearchWriteConflict(error)) {
        this.logger.warn(
          `Conflicting writes to conversation ${conversationId} could not be reconciled`
        );

        throw createConversationWriteConflictError({ conversationId });
      }

      throw error;
    }
  }

  private createWriter({
    access,
    maxRetries,
  }: {
    access: ConversationAccess;
    maxRetries: number;
  }): OccWriter<Conversation> {
    return new OccWriter<Conversation>({
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
      retryDelayMs: 400,
    });
  }

  /**
   * Validates the request and builds the replacement access control, carrying `added_at` over
   * for members that are already listed so re-sharing does not reset when they were added.
   */
  private buildAccessControlUpdate({
    current,
    update,
  }: {
    current: Conversation;
    update: UpdateConversationAccessControlRequestBody;
  }): ConversationAccessControl {
    const { access_mode: accessMode, entries } = update;
    const ownerId = current.user.id;

    if (accessMode === ConversationAccessControlMode.Public && entries.length > 0) {
      throw createBadRequestError('ACL entries are not supported when access_mode is "public"');
    }

    if (entries.length > CONVERSATION_ACCESS_CONTROL_MAX_ENTRIES) {
      throw createBadRequestError(
        `ACL entries exceed maximum of ${CONVERSATION_ACCESS_CONTROL_MAX_ENTRIES}`
      );
    }

    const addedAtById = new Map(
      normalizeConversationAccessControl(current.access_control).entries.map((entry) => [
        `${entry.type}:${entry.id}`,
        entry.added_at,
      ])
    );

    return {
      access_mode: accessMode,
      entries: validateAccessControlEntries({ entries, ownerId, addedAtById }),
    };
  }
}

/**
 * Validates each requested entry and stamps `added_at`, carrying it over from `addedAtById`
 * for members already listed so re-sharing does not reset when they were added. An entry
 * naming the owner is dropped, since owner access is keyed off document ownership, not entries.
 */
export const validateAccessControlEntries = ({
  entries,
  ownerId,
  addedAtById,
}: {
  entries: UpdateConversationAccessControlRequestBody['entries'];
  ownerId: string | undefined;
  addedAtById: Map<string, string>;
}): ConversationAccessControlEntry[] => {
  const now = new Date().toISOString();
  const seen = new Set<string>();
  const normalizedEntries: ConversationAccessControlEntry[] = [];

  for (const entry of entries) {
    if (!entry || entry.type !== 'user') {
      throw createBadRequestError('Each ACL entry requires a type of "user"');
    }

    if (typeof entry.id !== 'string' || entry.id.length === 0) {
      throw createBadRequestError('Each ACL entry requires a non-empty id');
    }

    if (entry.id.length > CONVERSATION_ACCESS_CONTROL_PRINCIPAL_ID_MAX_LENGTH) {
      throw createBadRequestError(
        `ACL principal id exceeds maximum length of ${CONVERSATION_ACCESS_CONTROL_PRINCIPAL_ID_MAX_LENGTH}`
      );
    }

    if (!isConversationAccessControlRole(entry.role)) {
      throw createBadRequestError(`Unknown ACL role: ${String(entry.role)}`);
    }

    // Owner access is keyed off document ownership, so an owner entry would be inert.
    if (ownerId !== undefined && entry.id === ownerId) {
      continue;
    }

    const key = `${entry.type}:${entry.id}`;

    if (seen.has(key)) {
      throw createBadRequestError(`Duplicate ACL entry for ${entry.type} "${entry.id}"`);
    }

    seen.add(key);

    normalizedEntries.push({
      type: entry.type,
      id: entry.id,
      role: entry.role,
      added_at: addedAtById.get(key) ?? now,
    });
  }

  return normalizedEntries;
};
