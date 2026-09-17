/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import {
  ConversationAccessControlMode,
  ConversationAccessControlRole,
} from '@kbn/agent-builder-common';
import type {
  ConversationPublicClient,
  ConversationTemplatesStart,
} from '@kbn/agent-builder-server';
import type { ConversationSearchSort } from '@kbn/agent-builder-common';
import type {
  CreateIncidentRequest,
  IncidentConversation,
  ListIncidentsQuery,
  ListIncidentsResponse,
  UpdateIncidentRequest,
} from '../../../common/incidents/incident';
import {
  INCIDENT_LINKED_INVESTIGATIONS_FIELD,
  INCIDENT_TEMPLATE_ID,
  INVESTIGATION_TEMPLATE_ID,
} from '../../../common/incidents/constants';
import { InvalidLinkedInvestigationError } from './errors';
import { filterMetadataToTemplateFields } from './filter_template_metadata';

/**
 * Fixed KQL filter applied to every list query.
 *
 * `template_id` scopes to incidents only. `not (metadata.status: "closed")` uses
 * the incident template's `status` metadata field — **not** the bare `status` filter
 * field, which maps to the conversation-level `ConversationRoundStatus`
 * (`in_progress`/`completed`/…) and would silently return closed incidents.
 *
 * `not` compiles to `bool.must_not`, which keeps documents where the field is absent
 * rather than hiding them. That is correct: a document without `metadata.status`
 * is not a closed incident.
 */
const NON_CLOSED_INCIDENTS_FILTER =
  `template_id: "${INCIDENT_TEMPLATE_ID}" and not (metadata.status: "closed")` as const;

/**
 * Newest activity first. Passed explicitly so the sort is part of this endpoint's
 * own contract and is not silently changed by an upstream default change.
 * The conversation client appends `created_at` as a deterministic paging tiebreaker.
 */
const INCIDENTS_LIST_SORT: ConversationSearchSort = { field: 'updated_at', order: 'desc' };

export interface IncidentsServiceDeps {
  logger: Logger;
  /**
   * Returns a conversation client scoped to the request's user and space.
   *
   * Note: IncidentsService takes a KibanaRequest rather than pre-resolved
   * `{ spaceId, user }` because the conversation client must be scoped per-request
   * (agent_builder resolves user identity and space from the request itself).
   * This is a deliberate deviation from ProposalsService's shape.
   */
  getConversationClient: (request: KibanaRequest) => Promise<ConversationPublicClient>;
  conversationTemplates: ConversationTemplatesStart;
}

/**
 * Orchestrates incident operations on top of agent_builder's conversation client.
 *
 * Incidents own no storage: they are conversations in agent_builder's
 * `.chat-conversations` index with `template_id: 'incident'`. There is no
 * IncidentsStorage, no index mapping, and no StorageIndexAdapter — all of
 * that is inherited from the conversation layer. This is a deliberate deviation
 * from the plugin README's "each entity gets its own index" rule (README.md:211);
 * the README records the exception.
 */
export class IncidentsService {
  private readonly logger: Logger;
  private readonly getConversationClient: (
    request: KibanaRequest
  ) => Promise<ConversationPublicClient>;
  private readonly conversationTemplates: ConversationTemplatesStart;

  constructor({ logger, getConversationClient, conversationTemplates }: IncidentsServiceDeps) {
    this.logger = logger;
    this.getConversationClient = getConversationClient;
    this.conversationTemplates = conversationTemplates;
  }

  async create(request: KibanaRequest, body: CreateIncidentRequest): Promise<IncidentConversation> {
    const client = await this.getConversationClient(request);

    // Fetch and validate the source investigation. Using the scoped client means the
    // caller can only escalate investigations they can already access.
    const investigation = await client.get(body.linked_investigation_id);
    if (investigation.template_id !== INVESTIGATION_TEMPLATE_ID) {
      throw new InvalidLinkedInvestigationError(body.linked_investigation_id);
    }

    // Resolve the incident template to get declared field names. Using the live registry
    // rather than importing from agent_builder_platform keeps us correct when the template
    // changes (e.g. a new field is added or removed).
    const incidentTemplate = await this.conversationTemplates.get(INCIDENT_TEMPLATE_ID);
    if (!incidentTemplate) {
      // The incident template is registered by agent_builder_platform at startup. Its
      // absence means the deployment is misconfigured, not that the caller made an error.
      throw new Error(
        `Incident template "${INCIDENT_TEMPLATE_ID}" not found — check that agent_builder_platform is enabled`
      );
    }

    // Copy investigation metadata to the incident, filtered to the keys the incident
    // template declares. Must exclude linked_investigations because we set it ourselves.
    // Must NOT copy status — let the template default ('open') apply so an incident
    // escalated from a closed investigation starts open.
    const filteredMetadata = filterMetadataToTemplateFields({
      metadata: investigation.metadata as
        | Record<string, string | number | boolean | string[]>
        | undefined,
      declaredFields: Object.keys(incidentTemplate.fields),
      exclude: [INCIDENT_LINKED_INVESTIGATIONS_FIELD, 'status'],
    });

    const metadata = {
      ...filteredMetadata,
      [INCIDENT_LINKED_INVESTIGATIONS_FIELD]: [body.linked_investigation_id],
    };

    const accessControl =
      body.visibility === 'public'
        ? { access_mode: ConversationAccessControlMode.Public }
        : {
            access_mode: ConversationAccessControlMode.Private,
            entries: body.collaborators.map((id) => ({
              type: 'user' as const,
              id,
              role: ConversationAccessControlRole.Member,
              // `added_at` is stamped by createConversationPublicClient (conversation_public_client.ts:48-51)
            })),
          };

    // Use the investigation's title as the incident's initial title.
    // The update route can retitle. "New conversation" (the fallback) is worse.
    this.logger.debug(
      `Creating incident from investigation ${body.linked_investigation_id} with visibility ${body.visibility}`
    );

    return client.create({
      // Do not pass agentId — createConversationPublicClient resolves agentBuilderDefaultAgentId,
      // which is accessible to all Agent Builder users. Inheriting the investigation's agent_id
      // would silently hide the incident from collaborators who lack access to that agent
      // (list() intersects with accessible agent ids; buildBaseFilters drops any conversation
      // whose agent is inaccessible — client.ts:383). Default agent = ACL governs visibility.
      title: investigation.title,
      templateId: INCIDENT_TEMPLATE_ID,
      metadata,
      accessControl,
    });
  }

  async update(
    request: KibanaRequest,
    incidentId: string,
    body: UpdateIncidentRequest
  ): Promise<IncidentConversation> {
    const client = await this.getConversationClient(request);

    // Fetch the current state for two reasons:
    // 1. Verify this is actually an incident (not letting this endpoint touch investigations).
    // 2. Pre-read the current linked_investigations list for the union computation.
    //
    // MVP caveat: the union is computed here, outside the OCC write callback. Two concurrent
    // PATCH requests that each read the same stale list can each overwrite the other's link,
    // so one linked investigation is silently lost. This is accepted for the MVP.
    // Follow-up: move the union into the patchMetadata `fields` callback so it is replayed
    // against fresh state on every OCC retry (writeConversation:1087).
    const current = await client.get(incidentId);
    if (current.template_id !== INCIDENT_TEMPLATE_ID) {
      throw new InvalidLinkedInvestigationError(incidentId);
    }

    let result: IncidentConversation = current;

    if (body.linked_investigations?.length) {
      const prev = (current.metadata?.[INCIDENT_LINKED_INVESTIGATIONS_FIELD] ?? []) as string[];
      const toAdd = body.linked_investigations;
      // Deduplicate: keep the existing order, append only new ids.
      const union = [...prev, ...toAdd.filter((id) => !prev.includes(id))];

      const { conversation } = await client.patchMetadata(incidentId, {
        [INCIDENT_LINKED_INVESTIGATIONS_FIELD]: union,
      });
      result = conversation;
    }

    if (body.title !== undefined) {
      // Title and metadata are two OCC writes, not one atomic operation. A failure between
      // them leaves the metadata write applied but the title unchanged. Both are idempotent
      // and independently meaningful, so this is acceptable for the MVP.
      result = await client.update({ id: incidentId, title: body.title });
    }

    return result;
  }

  async list(request: KibanaRequest, query: ListIncidentsQuery): Promise<ListIncidentsResponse> {
    const client = await this.getConversationClient(request);

    const { results, total } = await client.search({
      filter: NON_CLOSED_INCIDENTS_FILTER,
      sort: INCIDENTS_LIST_SORT,
      page: query.page,
      perPage: query.per_page,
    });

    return { pagination: { total, page: query.page, per_page: query.per_page }, results };
  }
}
