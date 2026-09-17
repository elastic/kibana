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

// Scopes list results to incidents and hides closed ones. Uses `metadata.status` (the
// template field), not the bare `status` field (which tracks round execution state).
const NON_CLOSED_INCIDENTS_FILTER =
  `template_id: "${INCIDENT_TEMPLATE_ID}" and not (metadata.status: "closed")` as const;

const INCIDENTS_LIST_SORT: ConversationSearchSort = { field: 'updated_at', order: 'desc' };

export interface IncidentsServiceDeps {
  logger: Logger;
  getConversationClient: (request: KibanaRequest) => Promise<ConversationPublicClient>;
  conversationTemplates: ConversationTemplatesStart;
}

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

    const investigation = await client.get(body.linked_investigation_id);
    if (investigation.template_id !== INVESTIGATION_TEMPLATE_ID) {
      throw new InvalidLinkedInvestigationError(body.linked_investigation_id);
    }

    const incidentTemplate = await this.conversationTemplates.get(INCIDENT_TEMPLATE_ID);
    if (!incidentTemplate) {
      throw new Error(
        `Incident template "${INCIDENT_TEMPLATE_ID}" not found — check that agent_builder_platform is enabled`
      );
    }

    // Copy investigation metadata to the incident, filtered to the keys the incident template
    // declares. Excludes linked_investigations (set below) and status (let the template default apply).
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
            })),
          };

    this.logger.debug(
      `Creating incident from investigation ${body.linked_investigation_id} with visibility ${body.visibility}`
    );

    return client.create({
      // Omit agentId so it defaults to the shared default agent, which all users can access.
      // Inheriting the investigation's agent_id would hide the incident from collaborators
      // who lack access to that agent.
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

    const current = await client.get(incidentId);
    if (current.template_id !== INCIDENT_TEMPLATE_ID) {
      throw new InvalidLinkedInvestigationError(incidentId);
    }

    let result: IncidentConversation = current;

    if (body.linked_investigations?.length) {
      const prev = (current.metadata?.[INCIDENT_LINKED_INVESTIGATIONS_FIELD] ?? []) as string[];
      const toAdd = body.linked_investigations;
      const union = [...prev, ...toAdd.filter((id) => !prev.includes(id))];

      const { conversation } = await client.patchMetadata(incidentId, {
        [INCIDENT_LINKED_INVESTIGATIONS_FIELD]: union,
      });
      result = conversation;
    }

    if (body.title !== undefined) {
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
