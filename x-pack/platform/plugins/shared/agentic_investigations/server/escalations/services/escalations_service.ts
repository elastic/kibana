/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { escapeQuotes } from '@kbn/es-query';
import {
  ConversationAccessControlMode,
  ConversationAccessControlRole,
  createConversationNotFoundError,
} from '@kbn/agent-builder-common';
import type {
  AttachmentPublicClient,
  ConversationPublicClient,
  ConversationTemplatesStart,
} from '@kbn/agent-builder-server';
import type { ConversationSearchSort } from '@kbn/agent-builder-common';
import type {
  CreateEscalationRequest,
  EscalationConversation,
  LinkEscalationRequest,
  LinkedInvestigationSummary,
  ListEscalationsQuery,
  ListEscalationsResponse,
  ListLinkedInvestigationsResponse,
} from '../../../common/escalations/escalation';
import type {
  EscalationClosePreviewResponse,
  SetEscalationStatusRequest,
  SetEscalationStatusResponse,
} from '../../../common/investigations/status';
import type { ImpactReadClient } from '../../impact/services/impact_client';
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
import {
  ESCALATION_CREATED_FROM_INVESTIGATION_EVENT_TYPE,
  ESCALATION_INVESTIGATION_LINKED_EVENT_TYPE,
  type EscalationInvestigationEventData,
} from '../../../common/escalations/conversation_events';
import { filterMetadataToTemplateFields } from './filter_template_metadata';
import { copyInvestigationAttachments } from './copy_investigation_attachments';

/** Agent Builder rejects `addEvents` calls with more events than this. */
const MAX_EVENTS_PER_REQUEST = 10;

const toEventData = ({
  id,
  title,
  agent_id: agentId,
}: {
  id: string;
  title: string;
  agent_id?: string;
}): EscalationInvestigationEventData => ({
  investigation_id: id,
  title,
  ...(agentId ? { agent_id: agentId } : {}),
});

/**
 * Builds the Elasticsearch filter clause for the list endpoint.
 *
 * "open" is expressed as *not closed* rather than `metadata.status: "open"` so
 * escalations created before the template default was applied (and therefore
 * missing a status value) still appear in the open bucket.
 *
 * Uses `metadata.status` (the template field), not the bare `status` field
 * (which tracks round execution state).
 *
 * When `linked_investigation_id` is provided, only escalations that include
 * that id in their `metadata.linked_investigations` array are returned.
 * `metadata` is a flattened field, so a KQL keyword term match against
 * `metadata.linked_investigations` tests array membership.
 */
const buildEscalationsFilter = (
  query: Pick<ListEscalationsQuery, 'status' | 'linked_investigation_id'>
): string => {
  const base = `template_id: "${ESCALATION_TEMPLATE_ID}"`;

  let filter: string;
  if (query.status === 'all') {
    filter = base;
  } else if (query.status === 'closed') {
    filter = `${base} and metadata.status: "closed"`;
  } else {
    // 'open' — fall through. "not closed" instead of "open" for the reason above.
    filter = `${base} and not (metadata.status: "closed")`;
  }

  if (query.linked_investigation_id) {
    filter = `${filter} and metadata.${ESCALATION_LINKED_INVESTIGATIONS_FIELD}: "${escapeQuotes(
      query.linked_investigation_id
    )}"`;
  }

  return filter;
};

const ESCALATIONS_LIST_SORT: ConversationSearchSort = { field: 'updated_at', order: 'desc' };

export interface EscalationsServiceDeps {
  logger: Logger;
  getConversationClient: (request: KibanaRequest) => Promise<ConversationPublicClient>;
  getAttachmentsClient: (request: KibanaRequest) => Promise<AttachmentPublicClient>;
  conversationTemplates: ConversationTemplatesStart;
  getInvestigationStatusService: () => InvestigationStatusService;
  getImpactClient: (request: KibanaRequest) => ImpactReadClient;
}

export class EscalationsService {
  private readonly logger: Logger;
  private readonly getImpactClient: (request: KibanaRequest) => ImpactReadClient;
  private readonly getConversationClient: (
    request: KibanaRequest
  ) => Promise<ConversationPublicClient>;
  private readonly getAttachmentsClient: (
    request: KibanaRequest
  ) => Promise<AttachmentPublicClient>;
  private readonly conversationTemplates: ConversationTemplatesStart;
  private readonly getInvestigationStatusService: () => InvestigationStatusService;

  constructor({
    logger,
    getConversationClient,
    getAttachmentsClient,
    conversationTemplates,
    getInvestigationStatusService,
    getImpactClient,
  }: EscalationsServiceDeps) {
    this.logger = logger;
    this.getImpactClient = getImpactClient;
    this.getConversationClient = getConversationClient;
    this.getAttachmentsClient = getAttachmentsClient;
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

    // Dedupe
    const assignees = [...new Set(body.assignees)];

    const metadata = {
      ...filteredMetadata,
      [ESCALATION_LINKED_INVESTIGATIONS_FIELD]: [body.linked_investigation_id],
      [ESCALATION_ASSIGNEES_FIELD]: assignees,
    };

    const accessControl =
      body.visibility === 'public'
        ? { access_mode: ConversationAccessControlMode.Public }
        : {
            access_mode: ConversationAccessControlMode.Private,
            entries: assignees.map((id) => ({
              type: 'user' as const,
              id,
              role: ConversationAccessControlRole.Member,
            })),
          };

    this.logger.debug(
      `Creating escalation from investigation ${body.linked_investigation_id} with visibility ${body.visibility}`
    );

    const escalation = await client.create({
      // Omit agentId so it defaults to the shared default agent, which all users can access.
      // Inheriting the investigation's agent_id would hide the escalation from collaborators
      // who lack access to that agent.
      title: body.title ?? investigation.title,
      templateId: ESCALATION_TEMPLATE_ID,
      metadata,
      accessControl,
    });

    await this.addTimelineEvents(client, escalation.id, [
      {
        type: ESCALATION_CREATED_FROM_INVESTIGATION_EVENT_TYPE,
        data: toEventData(investigation),
      },
    ]);

    return escalation;
  }

  async link(
    request: KibanaRequest,
    escalationId: string,
    body: LinkEscalationRequest
  ): Promise<EscalationConversation> {
    const client = await this.getConversationClient(request);

    const current = await client.get(escalationId);
    if (current.template_id !== ESCALATION_TEMPLATE_ID) {
      throw new NotAnEscalationError(escalationId);
    }

    const toAdd = body.linked_investigations;
    // bulkGet omits inaccessible / non-existent ids silently, so we detect them
    // via absence in the result map.
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

    const { conversation } = await client.patchMetadata(
      escalationId,
      { [ESCALATION_LINKED_INVESTIGATIONS_FIELD]: union },
      { access: 'converse' }
    );

    const previouslyLinked = new Set(prev);
    await this.addTimelineEvents(
      client,
      escalationId,
      toAdd
        .filter((id, index) => !previouslyLinked.has(id) && toAdd.indexOf(id) === index)
        .map((id) => ({
          type: ESCALATION_INVESTIGATION_LINKED_EVENT_TYPE,
          data: toEventData(resolved.get(id)!),
        }))
    );

    return conversation;
  }

  /**
   * Writes informational events to the escalation's timeline. Best-effort like `addAttachments`:
   * a failed note is logged and never fails the escalation write that preceded it.
   */
  private async addTimelineEvents(
    client: ConversationPublicClient,
    escalationId: string,
    events: Array<{ type: string; data: EscalationInvestigationEventData }>
  ): Promise<void> {
    for (let i = 0; i < events.length; i += MAX_EVENTS_PER_REQUEST) {
      try {
        await client.addEvents({
          conversationId: escalationId,
          events: events.slice(i, i + MAX_EVENTS_PER_REQUEST),
        });
      } catch (error) {
        this.logger.warn(
          `Failed to add timeline events to escalation ${escalationId}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }

  /**
   * Copies all active, non-screen_context attachments from each of the given investigations to
   * the escalation. Intended to be called from route handlers after `create` or `link` so that
   * the metadata write and the attachment copy are separate concerns.
   *
   * The method is best-effort: individual attachment failures are logged and counted but never
   * thrown. Calling it again for the same investigation is idempotent — already-copied attachments
   * (identified by their deterministic ids) are silently skipped.
   *
   * @returns Total counts of successfully copied and failed attachments across all investigations.
   */
  async addAttachments(
    request: KibanaRequest,
    escalationId: string,
    investigationIds: string[]
  ): Promise<{ copied: number; failed: number }> {
    const client = await this.getConversationClient(request);
    const escalation = await client.get(escalationId);
    if (escalation.template_id !== ESCALATION_TEMPLATE_ID) {
      throw new NotAnEscalationError(escalationId);
    }

    const attachmentsClient = await this.getAttachmentsClient(request);
    let totalCopied = 0;
    let totalFailed = 0;

    // Run sequentially to avoid OCC conflicts: all copies target the same escalation document.
    for (const investigationId of investigationIds) {
      const investigation = await client.get(investigationId);
      if (investigation.template_id !== INVESTIGATION_TEMPLATE_ID) {
        this.logger.warn(
          `[escalations] Skipping attachment copy from non-investigation. escalationId=${escalationId} conversationId=${investigationId} template=${investigation.template_id}`
        );
        continue;
      }

      const { copied, failed } = await copyInvestigationAttachments({
        attachmentsClient,
        escalation,
        investigation,
        logger: this.logger,
      });

      totalCopied += copied;
      totalFailed += failed;
    }

    return { copied: totalCopied, failed: totalFailed };
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
      filter: buildEscalationsFilter(query),
      sort: ESCALATIONS_LIST_SORT,
      page: query.page,
      perPage: query.per_page,
      query: query.search,
    });

    return {
      pagination: { total, page: query.page, per_page: query.per_page },
      results: await this.withEntityIds(request, results),
    };
  }

  /**
   * Escalations have no Impact document of their own; their impact is the union of the
   * entities of the investigations they link. Failure omits the field, like a missing
   * title, so the queue stays usable without pills.
   */
  private async withEntityIds(
    request: KibanaRequest,
    escalations: ListEscalationsResponse['results']
  ): Promise<ListEscalationsResponse['results']> {
    const linkedIdsByEscalation = escalations.map((escalation) => {
      const linked = escalation.metadata?.[ESCALATION_LINKED_INVESTIGATIONS_FIELD];
      return Array.isArray(linked) ? (linked as string[]) : [];
    });
    const allLinkedIds = linkedIdsByEscalation.flat();
    if (allLinkedIds.length === 0) return escalations;

    try {
      const entityIdsByInvestigation = await this.getImpactClient(
        request
      ).getEntityIdsByConversationId(allLinkedIds);

      return escalations.map((escalation, index) => {
        const entityIds = [
          ...new Set(
            linkedIdsByEscalation[index].flatMap((id) => entityIdsByInvestigation.get(id) ?? [])
          ),
        ];
        return entityIds.length > 0 ? { ...escalation, entity_ids: entityIds } : escalation;
      });
    } catch (err) {
      this.logger.debug(`Could not resolve escalation impact: ${err}`);
      return escalations;
    }
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
