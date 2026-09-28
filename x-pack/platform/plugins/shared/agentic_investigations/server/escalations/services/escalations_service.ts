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
import type { MetadataFieldValue } from '@kbn/agent-builder-common';
import type {
  ConversationPublicClient,
  ConversationTemplatesStart,
} from '@kbn/agent-builder-server';
import type { ConversationSearchSort } from '@kbn/agent-builder-common';
import type {
  CreateEscalationRequest,
  EscalationConversation,
  LinkedInvestigationSummary,
  ListEscalationsQuery,
  ListEscalationsResponse,
  ListLinkedInvestigationsResponse,
  UpdateEscalationRequest,
} from '../../../common/escalations/escalation';
import type {
  EscalationClosePreviewResponse,
  SetEscalationStatusRequest,
  SetEscalationStatusResponse,
} from '../../../common/investigations/status';
import type { InvestigationStatusService } from '../../investigations/services/investigation_status_service';
import { assertNoUnexpectedProposals } from '../../investigations/services/investigation_status_service';
import { CloseTargetsChangedError } from '../../investigations/services/close_targets_changed_error';
import { EscalationCloseIncompleteError } from './escalation_close_incomplete_error';
import { LinkedInvestigationUnavailableError } from './linked_investigation_unavailable_error';
import {
  ESCALATION_ASSIGNEES_FIELD,
  ESCALATION_LINKED_INVESTIGATIONS_FIELD,
  ESCALATION_STATUS_FIELD,
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

/**
 * Builds the Elasticsearch filter clause for the list endpoint.
 *
 * "open" is expressed as *not closed* rather than `metadata.status: "open"` so
 * escalations created before the template default was applied (and therefore
 * missing a status value) still appear in the open bucket.
 *
 * Uses `metadata.status` (the template field), not the bare `status` field
 * (which tracks round execution state).
 */
const buildEscalationsFilter = (status: ListEscalationsQuery['status']): string => {
  const base = `template_id: "${ESCALATION_TEMPLATE_ID}"`;
  if (status === 'all') return base;
  if (status === 'closed') return `${base} and metadata.status: "closed"`;
  // 'open' — fall through. "not closed" instead of "open" for the reason above.
  return `${base} and not (metadata.status: "closed")`;
};

const ESCALATIONS_LIST_SORT: ConversationSearchSort = { field: 'updated_at', order: 'desc' };

export interface EscalationsServiceDeps {
  logger: Logger;
  getConversationClient: (request: KibanaRequest) => Promise<ConversationPublicClient>;
  conversationTemplates: ConversationTemplatesStart;
  getInvestigationStatusService: () => InvestigationStatusService;
}

export class EscalationsService {
  private readonly logger: Logger;
  private readonly getConversationClient: (
    request: KibanaRequest
  ) => Promise<ConversationPublicClient>;
  private readonly conversationTemplates: ConversationTemplatesStart;
  private readonly getInvestigationStatusService: () => InvestigationStatusService;

  constructor({
    logger,
    getConversationClient,
    conversationTemplates,
    getInvestigationStatusService,
  }: EscalationsServiceDeps) {
    this.logger = logger;
    this.getConversationClient = getConversationClient;
    this.conversationTemplates = conversationTemplates;
    this.getInvestigationStatusService = getInvestigationStatusService;
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
      ...(body.assignees?.length ? { [ESCALATION_ASSIGNEES_FIELD]: body.assignees } : {}),
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
      title: body.title ?? investigation.title,
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

    // Accumulate all metadata fields so they land in a single OCC-protected write.
    // Sending them as separate patchMetadata calls would allow partial application:
    // if a later write failed, earlier fields would already be committed.
    const metadataUpdates: Record<string, MetadataFieldValue> = {};

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

      metadataUpdates[ESCALATION_LINKED_INVESTIGATIONS_FIELD] = union;
    }

    if (Object.keys(metadataUpdates).length > 0) {
      const { conversation } = await client.patchMetadata(escalationId, metadataUpdates, {
        access: 'converse',
      });
      result = conversation;
    }

    if (body.title !== undefined) {
      result = await client.update({ id: escalationId, title: body.title });
    }

    return result;
  }

  async getClosePreview(
    request: KibanaRequest,
    escalationId: string
  ): Promise<EscalationClosePreviewResponse> {
    const client = await this.getConversationClient(request);
    const current = await client.get(escalationId);
    if (current.template_id !== ESCALATION_TEMPLATE_ID) {
      throw new NotAnEscalationError(escalationId);
    }

    const linkedIds = (current.metadata?.[ESCALATION_LINKED_INVESTIGATIONS_FIELD] ??
      []) as string[];
    if (linkedIds.length === 0) {
      return { open_investigations: [], unavailable_investigation_ids: [] };
    }

    const resolved = await client.bulkGet(linkedIds);

    // Collect ids that bulkGet could not resolve (deleted or inaccessible).
    const unavailableIds = linkedIds.filter((id) => !resolved.has(id));

    const openConversations = linkedIds
      .map((id) => resolved.get(id))
      .filter(
        (conv): conv is NonNullable<typeof conv> =>
          conv !== undefined && conv.metadata?.status !== 'closed'
      );

    const statusSvc = this.getInvestigationStatusService();
    const openInvestigations = await Promise.all(
      openConversations.map(async (conv) => {
        const preview = await statusSvc.getPreview(request, conv.id);
        return {
          id: conv.id,
          title: conv.title,
          pending_proposal_count: preview.pending_proposal_count,
          pending_proposals: preview.pending_proposals,
        };
      })
    );

    return {
      open_investigations: openInvestigations,
      unavailable_investigation_ids: unavailableIds,
    };
  }

  async setStatus(
    request: KibanaRequest,
    escalationId: string,
    body: SetEscalationStatusRequest
  ): Promise<SetEscalationStatusResponse> {
    const client = await this.getConversationClient(request);
    const current = await client.get(escalationId);
    if (current.template_id !== ESCALATION_TEMPLATE_ID) {
      throw new NotAnEscalationError(escalationId);
    }

    const closedInvestigationIds: string[] = [];
    const skippedInvestigationIds: string[] = [];
    const allDismissedProposalIds: string[] = [];
    const allFailedProposalIds: string[] = [];

    if (body.status === 'closed') {
      const linkedIds = (current.metadata?.[ESCALATION_LINKED_INVESTIGATIONS_FIELD] ??
        []) as string[];
      if (linkedIds.length > 0) {
        const resolved = await client.bulkGet(linkedIds);

        // Reject the close when any linked id cannot be resolved (deleted / inaccessible).
        // Closing without touching those investigations would leave them permanently open
        // while the escalation is marked closed.
        const unavailableIds = linkedIds.filter((id) => !resolved.has(id));
        if (unavailableIds.length > 0) {
          throw new LinkedInvestigationUnavailableError(unavailableIds);
        }

        const openIds = linkedIds.filter((id) => {
          const conv = resolved.get(id);
          return conv !== undefined && conv.metadata?.status !== 'closed';
        });

        // -----------------------------------------------------------------------
        // Pre-flight: check for unexpected investigations or proposals before
        // touching anything, so a mismatch leaves nothing half-closed.
        // -----------------------------------------------------------------------
        if (body.expected_investigation_ids !== undefined) {
          const expectedInvSet = new Set(body.expected_investigation_ids);
          const unexpectedInvs = openIds.filter((id) => !expectedInvSet.has(id));
          if (unexpectedInvs.length > 0) {
            throw new CloseTargetsChangedError(
              `${unexpectedInvs.length} linked investigation(s) opened after the dialog appeared`
            );
          }
        }

        const statusSvc = this.getInvestigationStatusService();

        if (body.expected_proposal_ids !== undefined) {
          const allPendingPerInv = await Promise.all(
            openIds.map((id) => statusSvc.listPendingProposalsForRequest(id, request))
          );
          const allPending = allPendingPerInv.flat();
          // Reuse the same check as investigations — throws CloseTargetsChangedError.
          assertNoUnexpectedProposals(allPending, body.expected_proposal_ids);
        }
        const results = await Promise.allSettled(
          openIds.map((id) =>
            statusSvc.setStatus(request, id, {
              status: 'closed',
              dismiss_reason: body.dismiss_reason,
              rationale: body.rationale,
              // Pass the full expected_proposal_ids list. The pre-flight check above already
              // verified that every pending proposal across all open investigations was
              // expected, so the per-investigation check inside setStatus will always pass.
              // We still send it so the service stays correct if called in isolation.
              expected_proposal_ids: body.expected_proposal_ids,
            })
          )
        );

        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const invId = openIds[i];
          if (result.status === 'fulfilled') {
            closedInvestigationIds.push(invId);
            allDismissedProposalIds.push(...result.value.dismissed_proposal_ids);
            allFailedProposalIds.push(...result.value.failed_proposal_ids);
          } else {
            this.logger.error(
              `Failed to close investigation ${invId} while closing escalation ${escalationId}: ${
                result.reason instanceof Error ? result.reason.message : String(result.reason)
              }`
            );
            skippedInvestigationIds.push(invId);
          }
        }

        // Do not mark the escalation closed when some investigations could not be closed.
        // Investigations that did close stay closed; the next confirm only needs to handle
        // the remaining open ones (the preview only lists open investigations).
        if (skippedInvestigationIds.length > 0) {
          throw new EscalationCloseIncompleteError(closedInvestigationIds, skippedInvestigationIds);
        }
      }
    }

    const { conversation: updated } = await client.patchMetadata(
      escalationId,
      { [ESCALATION_STATUS_FIELD]: body.status },
      { access: 'converse' }
    );

    return {
      escalation_id: updated.id,
      status: body.status,
      closed_investigation_ids: closedInvestigationIds,
      skipped_investigation_ids: skippedInvestigationIds,
      dismissed_proposal_ids: allDismissedProposalIds,
      failed_proposal_ids: allFailedProposalIds,
    };
  }

  async list(
    request: KibanaRequest,
    query: ListEscalationsQuery
  ): Promise<ListEscalationsResponse> {
    const client = await this.getConversationClient(request);

    const { results, total } = await client.search({
      filter: buildEscalationsFilter(query.status),
      sort: ESCALATIONS_LIST_SORT,
      page: query.page,
      perPage: query.per_page,
      query: query.search,
    });

    return { pagination: { total, page: query.page, per_page: query.per_page }, results };
  }

  /**
   * Returns brief summaries (id, title, status, agent_id) for the investigations linked to
   * an escalation. The order matches the stored `linked_investigations` array. Investigations
   * that are inaccessible to the current user are silently dropped by `client.bulkGet`.
   *
   * Status follows the same "missing or non-closed ⇒ open" rule as the escalations list filter.
   */
  async listLinkedInvestigations(
    request: KibanaRequest,
    escalationId: string
  ): Promise<ListLinkedInvestigationsResponse> {
    const client = await this.getConversationClient(request);

    const escalation = await client.get(escalationId);
    if (escalation.template_id !== ESCALATION_TEMPLATE_ID) {
      throw new NotAnEscalationError(escalationId);
    }

    const linkedIds = (
      (escalation.metadata?.[ESCALATION_LINKED_INVESTIGATIONS_FIELD] ?? []) as unknown[]
    ).filter((v): v is string => typeof v === 'string' && v.length > 0);

    if (linkedIds.length === 0) {
      return { results: [] };
    }

    const resolved = await client.bulkGet(linkedIds);

    // Preserve stored order; silently omit ids that bulkGet couldn't resolve or that resolved to
    // a non-investigation conversation (stale/corrupt linked_investigations entries).
    const results: LinkedInvestigationSummary[] = linkedIds.flatMap((id) => {
      const conv = resolved.get(id);
      if (!conv || conv.template_id !== INVESTIGATION_TEMPLATE_ID) return [];
      const rawStatus = conv.metadata?.status;
      const status: 'open' | 'closed' =
        typeof rawStatus === 'string' && rawStatus === 'closed' ? 'closed' : 'open';
      return [{ id: conv.id, title: conv.title, status, agent_id: conv.agent_id }];
    });

    return { results };
  }
}
