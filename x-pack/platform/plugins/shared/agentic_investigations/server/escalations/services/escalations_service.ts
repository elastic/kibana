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
  createConversationNotFoundError,
} from '@kbn/agent-builder-common';
import type {
  ConversationPublicClient,
  ConversationTemplatesStart,
} from '@kbn/agent-builder-server';
import type { ConversationSearchSort } from '@kbn/agent-builder-common';
import type {
  CreateEscalationRequest,
  EscalationConversation,
  ListEscalationsQuery,
  ListEscalationsResponse,
  UpdateEscalationRequest,
} from '../../../common/escalations/escalation';
import {
  ESCALATION_LINKED_INVESTIGATIONS_FIELD,
  ESCALATION_TEMPLATE_ID,
  INVESTIGATION_TEMPLATE_ID,
  MAX_ESCALATION_LINKED_INVESTIGATIONS,
} from '../../../common/escalations/constants';
import {
  InvalidLinkedInvestigationError,
  NotAnEscalationError,
  TooManyLinkedInvestigationsError,
} from './errors';
import { filterMetadataToTemplateFields } from './filter_template_metadata';

// Scopes list results to escalations and hides closed ones. Uses `metadata.status` (the
// template field), not the bare `status` field (which tracks round execution state).
const NON_CLOSED_ESCALATIONS_FILTER =
  `template_id: "${ESCALATION_TEMPLATE_ID}" and not (metadata.status: "closed")` as const;

const ESCALATIONS_LIST_SORT: ConversationSearchSort = { field: 'updated_at', order: 'desc' };

export interface EscalationsServiceDeps {
  logger: Logger;
  getConversationClient: (request: KibanaRequest) => Promise<ConversationPublicClient>;
  conversationTemplates: ConversationTemplatesStart;
}

export class EscalationsService {
  private readonly logger: Logger;
  private readonly getConversationClient: (
    request: KibanaRequest
  ) => Promise<ConversationPublicClient>;
  private readonly conversationTemplates: ConversationTemplatesStart;

  constructor({ logger, getConversationClient, conversationTemplates }: EscalationsServiceDeps) {
    this.logger = logger;
    this.getConversationClient = getConversationClient;
    this.conversationTemplates = conversationTemplates;
  }

  async create(
    request: KibanaRequest,
    body: CreateEscalationRequest
  ): Promise<EscalationConversation> {
    const client = await this.getConversationClient(request);

    const investigation = await client.get(body.linked_investigation_id);
    if (investigation.template_id !== INVESTIGATION_TEMPLATE_ID) {
      throw new InvalidLinkedInvestigationError(body.linked_investigation_id);
    }

    const escalationTemplate = await this.conversationTemplates.get(ESCALATION_TEMPLATE_ID);
    if (!escalationTemplate) {
      throw new Error(
        `Escalation template "${ESCALATION_TEMPLATE_ID}" not found — check that agent_builder_platform is enabled`
      );
    }

    // Copy investigation metadata to the escalation, filtered to the keys the escalation template
    // declares. Excludes linked_investigations (set below), status (let the template default
    // apply), and close_reason (it describes why the *escalation* was closed, not the
    // investigation — inheriting it would yield an open escalation with a stale close reason).
    const filteredMetadata = filterMetadataToTemplateFields({
      metadata: investigation.metadata as
        | Record<string, string | number | boolean | string[]>
        | undefined,
      declaredFields: Object.keys(escalationTemplate.fields),
      exclude: [ESCALATION_LINKED_INVESTIGATIONS_FIELD, 'status', 'close_reason'],
    });

    const metadata = {
      ...filteredMetadata,
      [ESCALATION_LINKED_INVESTIGATIONS_FIELD]: [body.linked_investigation_id],
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
      `Creating escalation from investigation ${body.linked_investigation_id} with visibility ${body.visibility}`
    );

    return client.create({
      // Omit agentId so it defaults to the shared default agent, which all users can access.
      // Inheriting the investigation's agent_id would hide the escalation from collaborators
      // who lack access to that agent.
      title: investigation.title,
      templateId: ESCALATION_TEMPLATE_ID,
      metadata,
      accessControl,
    });
  }

  async update(
    request: KibanaRequest,
    escalationId: string,
    body: UpdateEscalationRequest
  ): Promise<EscalationConversation> {
    const client = await this.getConversationClient(request);

    const current = await client.get(escalationId);
    if (current.template_id !== ESCALATION_TEMPLATE_ID) {
      throw new NotAnEscalationError(escalationId);
    }

    let result: EscalationConversation = current;

    if (body.linked_investigations?.length) {
      // Validate that every id being appended is an accessible investigation.
      // bulkGet omits inaccessible / non-existent ids silently, so we detect them
      // via absence in the result map.
      const toAdd = body.linked_investigations;
      const resolved = await client.bulkGet(toAdd);
      for (const id of toAdd) {
        const conv = resolved.get(id);
        if (!conv) {
          throw createConversationNotFoundError({ conversationId: id });
        }
        if (conv.template_id !== INVESTIGATION_TEMPLATE_ID) {
          throw new InvalidLinkedInvestigationError(id);
        }
      }

      const prev = (current.metadata?.[ESCALATION_LINKED_INVESTIGATIONS_FIELD] ?? []) as string[];
      // Use a Set so duplicates within the incoming payload and against prev are both removed.
      const union = [...new Set([...prev, ...toAdd])];

      if (union.length > MAX_ESCALATION_LINKED_INVESTIGATIONS) {
        throw new TooManyLinkedInvestigationsError(
          union.length,
          MAX_ESCALATION_LINKED_INVESTIGATIONS
        );
      }

      const { conversation } = await client.patchMetadata(escalationId, {
        [ESCALATION_LINKED_INVESTIGATIONS_FIELD]: union,
      });
      result = conversation;
    }

    if (body.title !== undefined) {
      result = await client.update({ id: escalationId, title: body.title });
    }

    return result;
  }

  async list(
    request: KibanaRequest,
    query: ListEscalationsQuery
  ): Promise<ListEscalationsResponse> {
    const client = await this.getConversationClient(request);

    const { results, total } = await client.search({
      filter: NON_CLOSED_ESCALATIONS_FILTER,
      sort: ESCALATIONS_LIST_SORT,
      page: query.page,
      perPage: query.per_page,
    });

    return { pagination: { total, page: query.page, per_page: query.per_page }, results };
  }
}
