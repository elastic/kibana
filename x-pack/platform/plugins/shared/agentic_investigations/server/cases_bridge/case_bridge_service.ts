/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { parse as parseYaml } from 'yaml';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { CasesServerStart } from '@kbn/cases-plugin/server';
import type { Case } from '@kbn/cases-plugin/common';
import { CaseSeverity } from '@kbn/cases-plugin/common';
import type { ConversationPublicClient, AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import {
  ConversationAccessControlMode,
  ConversationAccessControlRole,
  EventActorType,
  type EventActor,
} from '@kbn/agent-builder-common';
import {
  ALERTZERO_CASE_OWNER,
  ALERTZERO_CASE_SOURCE,
  ALERTZERO_CASE_TAG,
  INVESTIGATION_CASE_ATTACHMENT_TYPE,
  INVESTIGATION_LINKED_TO_CASE_EVENT_TYPE,
  parseAiVerdict,
  type InvestigationLinkedToCaseEventData,
  type LinkCaseResponse,
  type LinkedInvestigationResult,
  type OpenCaseRequest,
  type OpenCaseResponse,
} from '../../common/cases_bridge';
import type { InvestigationStatusService } from '../investigations/services/investigation_status_service';

/** Cases' attachment type for an Agent Builder conversation (`cases/common/constants/attachments`). */
const AGENT_BUILDER_CONVERSATION_CASE_ATTACHMENT_TYPE = 'agentBuilder.conversation';

const INVESTIGATION_TEMPLATE_ID = 'investigation';
const MAX_DESCRIPTION_LENGTH = 30000;
const ACTOR_NAME = 'Elastic AI Agent';

type CasesClient = Awaited<ReturnType<CasesServerStart['getCasesClientWithRequest']>>;
type CaseActionSource = NonNullable<
  Parameters<CasesServerStart['getCasesClientWithRequest']>[1]
>['actionSource'];

/** The parts of a case the bridge reads: what `cases.get` returns and what case events carry. */
export interface BridgeCase {
  id: string;
  title: string;
  incremental_id?: number | null;
  status: string;
  assignees: Array<{ uid: string }>;
  access?: { mode: string } | null;
}

export interface CaseBridgeServiceDeps {
  logger: Logger;
  getCases: () => CasesServerStart | undefined;
  getAgentBuilder: () => AgentBuilderPluginStart;
  getInvestigationStatusService: () => InvestigationStatusService;
  getActor: (request: KibanaRequest) => EventActor | undefined;
  getCurrentUserProfileUid: (request: KibanaRequest) => Promise<string | undefined>;
  /** The investigations manage privilege, the bar of the open-a-case and link routes. */
  canManageInvestigations: (request: KibanaRequest) => Promise<boolean>;
  /** After a case close or reopen reached its investigations (Phase 5 recounts decisions). */
  onLinkedInvestigationsUpdated?: (request: KibanaRequest, caseId: string) => Promise<void>;
}

export class InvestigationAlreadyLinkedError extends Error {
  constructor(investigationId: string, caseId: string) {
    super(`Investigation ${investigationId} is already linked to case ${caseId}.`);
    this.name = 'InvestigationAlreadyLinkedError';
  }
}

const isRestricted = (theCase: Pick<BridgeCase, 'access'>): boolean =>
  theCase.access?.mode === 'restricted';

/** "#12" once Cases has assigned the incremental id, otherwise the case title. */
export const describeCase = (theCase: Pick<BridgeCase, 'incremental_id' | 'title'>): string =>
  theCase.incremental_id != null ? `#${theCase.incremental_id}` : `"${theCase.title}"`;

const toCaseSeverity = (severity: unknown): CaseSeverity | undefined => {
  switch (severity) {
    case 'low':
      return CaseSeverity.LOW;
    case 'medium':
      return CaseSeverity.MEDIUM;
    case 'high':
      return CaseSeverity.HIGH;
    case 'critical':
      return CaseSeverity.CRITICAL;
    default:
      return undefined;
  }
};

const toMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * The bridge between AlertZero investigations and Kibana Cases: opens a case from an
 * investigation, links investigations to cases (links, not copies), and keeps the linked
 * investigations' status and visibility following the case.
 */
export class CaseBridgeService {
  constructor(private readonly deps: CaseBridgeServiceDeps) {}

  private requireCases(): CasesServerStart {
    const cases = this.deps.getCases();
    if (!cases) {
      throw Boom.notFound('Cases is not available');
    }
    return cases;
  }

  private getConversationClient(request: KibanaRequest): Promise<ConversationPublicClient> {
    return this.deps.getAgentBuilder().conversations.getScopedClient({ request });
  }

  async openCase(
    request: KibanaRequest,
    investigationId: string,
    body: Required<Omit<OpenCaseRequest, 'template_id'>> & { template_id?: string },
    options: { actionSource?: CaseActionSource; extraTags?: string[] } = {}
  ): Promise<OpenCaseResponse> {
    // A Worker opening the case (Phase 5) is recorded as the actor; a person opening it is the user.
    const casesClient = await this.requireCases().getCasesClientWithRequest(
      request,
      options.actionSource ? { actionSource: options.actionSource } : undefined
    );
    const conversations = await this.getConversationClient(request);

    const source = await conversations.get(investigationId);
    if (source.template_id !== INVESTIGATION_TEMPLATE_ID) {
      throw Boom.notFound(`Investigation ${investigationId} was not found`);
    }
    const existingCaseId = source.metadata?.case_id;
    if (typeof existingCaseId === 'string' && existingCaseId.length > 0) {
      throw new InvestigationAlreadyLinkedError(investigationId, existingCaseId);
    }

    const requesterUid = await this.deps.getCurrentUserProfileUid(request);
    const assigneeUids = [...new Set([...(requesterUid ? [requesterUid] : []), ...body.assignees])];
    const summary = typeof source.metadata?.summary === 'string' ? source.metadata.summary : '';
    const verdict = parseAiVerdict(
      typeof source.metadata?.verdict === 'string' ? source.metadata.verdict : undefined
    );
    const severity = toCaseSeverity(source.metadata?.severity);
    const templateSync = body.template_id
      ? await this.getTemplateExternalSync(casesClient, body.template_id)
      : undefined;

    const createdCase = await casesClient.cases.create({
      title: body.title,
      description: (summary || `Opened from the AlertZero investigation "${source.title}".`).slice(
        0,
        MAX_DESCRIPTION_LENGTH
      ),
      tags: [ALERTZERO_CASE_TAG, ...(options.extraTags ?? [])],
      owner: ALERTZERO_CASE_OWNER,
      connector: { id: 'none', name: 'none', type: '.none', fields: null },
      // Automatic push stays off while the investigations are linked: an automatic push racing
      // the link writes lost the case update and opened a second incident. The template's
      // setting is turned back on after the one push below.
      settings: {
        syncAlerts: true,
        externalSync: {
          autoPush: false,
          conflictStrategy: templateSync?.conflictStrategy ?? 'external',
        },
      },
      assignees: assigneeUids.map((uid) => ({ uid })),
      ...(severity ? { severity } : {}),
      ...(body.template_id ? { template: { id: body.template_id } } : {}),
      ...(body.visibility === 'restricted' ? { access: { mode: 'restricted' as const } } : {}),
      source: ALERTZERO_CASE_SOURCE,
      ...(verdict
        ? {
            ai_verdict: {
              verdict,
              confidence: null,
              actor: { type: 'agent', id: source.agent_id, name: ACTOR_NAME, run_id: source.id },
              updated_at: new Date().toISOString(),
            },
          }
        : {}),
    } as Parameters<CasesClient['cases']['create']>[0]);

    const investigationIds = [
      investigationId,
      ...body.linked_investigation_ids.filter((id) => id !== investigationId),
    ];
    const linked = await this.linkInvestigations({
      request,
      casesClient,
      conversations,
      theCase: createdCase,
      investigationIds,
      openedFromId: investigationId,
    });

    let pushed = false;
    const connectorId = createdCase.connector?.id;
    const hasConnector = connectorId != null && connectorId !== 'none';
    if (body.push && hasConnector) {
      try {
        await casesClient.cases.push({
          caseId: createdCase.id,
          connectorId,
          pushType: 'automatic',
        });
        pushed = true;
      } catch (error) {
        this.deps.logger.warn(
          `Case ${
            createdCase.id
          } opened from investigation ${investigationId}, but pushing it failed: ${toMessage(
            error
          )}`
        );
      }
    }
    // Pushed: from now on the case pushes automatically when its template says so. Not after a
    // failed push, so the analyst's own push from the case can't race an automatic one.
    if (pushed && templateSync?.autoPush === true) {
      await this.turnOnAutoPush(casesClient, createdCase.id, templateSync);
    }

    return {
      case_id: createdCase.id,
      case_title: createdCase.title,
      incremental_id: createdCase.incremental_id ?? null,
      linked,
      pushed,
      ...(connectorId && connectorId !== 'none'
        ? { connector_name: createdCase.connector.name }
        : {}),
    };
  }

  private async turnOnAutoPush(
    casesClient: CasesClient,
    caseId: string,
    externalSync: { autoPush: boolean; conflictStrategy: 'external' | 'kibana' }
  ): Promise<void> {
    // One retry: the push's own writes can still be settling when this reads the version.
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const latest = await casesClient.cases.get({ id: caseId, includeComments: false });
        await casesClient.cases.bulkUpdate({
          cases: [
            {
              id: latest.id,
              version: latest.version,
              settings: { ...latest.settings, externalSync },
            },
          ],
        });
        return;
      } catch (error) {
        if (attempt === 2) {
          this.deps.logger.warn(
            `Case ${caseId} won't push automatically: turning it on failed: ${toMessage(error)}`
          );
        }
      }
    }
  }

  /** The template's sync settings, when it has them; a template that can't be read has none. */
  private async getTemplateExternalSync(
    casesClient: CasesClient,
    templateId: string
  ): Promise<{ autoPush: boolean; conflictStrategy: 'external' | 'kibana' } | undefined> {
    try {
      const template = await casesClient.templates.getTemplate(templateId);
      const definition = template ? parseYaml(template.attributes.definition) : undefined;
      const sync = definition?.settings?.externalSync;
      return sync && typeof sync.autoPush === 'boolean'
        ? {
            autoPush: sync.autoPush,
            conflictStrategy: sync.conflictStrategy === 'kibana' ? 'kibana' : 'external',
          }
        : undefined;
    } catch {
      return undefined;
    }
  }

  async linkCase(
    request: KibanaRequest,
    investigationId: string,
    caseId: string
  ): Promise<LinkCaseResponse> {
    const casesClient = await this.requireCases().getCasesClientWithRequest(request);
    const conversations = await this.getConversationClient(request);
    // Reading the case first means a case the user can't see (restricted, or another owner)
    // answers not-found before anything is written.
    const theCase = await casesClient.cases.get({ id: caseId });

    const [result] = await this.linkInvestigations({
      request,
      casesClient,
      conversations,
      theCase,
      investigationIds: [investigationId],
    });
    if (result.error) {
      throw Boom.conflict(result.error);
    }

    return {
      case_id: theCase.id,
      case_title: theCase.title,
      incremental_id: theCase.incremental_id ?? null,
      investigation_id: investigationId,
    };
  }

  /**
   * Links each investigation to the case: one reference attachment per investigation on the case,
   * the case id on the investigation, a timeline event the agent can read, and, when the case is
   * restricted, the investigation's visibility narrowed to the case's assignees.
   */
  private async linkInvestigations({
    request,
    casesClient,
    conversations,
    theCase,
    investigationIds,
    openedFromId,
  }: {
    request: KibanaRequest;
    casesClient: CasesClient;
    conversations: ConversationPublicClient;
    theCase: Case;
    investigationIds: string[];
    openedFromId?: string;
  }): Promise<LinkedInvestigationResult[]> {
    const results = new Map<string, LinkedInvestigationResult>();
    const toLink: Array<{ id: string; title: string; agentId: string }> = [];

    for (const id of investigationIds) {
      try {
        const investigation = await conversations.get(id);
        if (investigation.template_id !== INVESTIGATION_TEMPLATE_ID) {
          results.set(id, { id, error: `Investigation ${id} was not found` });
          continue;
        }
        const linkedCaseId = investigation.metadata?.case_id;
        if (typeof linkedCaseId === 'string' && linkedCaseId.length > 0) {
          if (linkedCaseId !== theCase.id) {
            results.set(id, {
              id,
              error: new InvestigationAlreadyLinkedError(id, linkedCaseId).message,
            });
          } else {
            results.set(id, { id });
          }
          continue;
        }
        toLink.push({ id, title: investigation.title, agentId: investigation.agent_id });
      } catch (error) {
        results.set(id, { id, error: toMessage(error) });
      }
    }

    if (toLink.length > 0) {
      const actor = this.deps.getActor(request);
      await casesClient.attachments.bulkCreate({
        caseId: theCase.id,
        attachments: toLink.map(({ id, title }) => ({
          type: INVESTIGATION_CASE_ATTACHMENT_TYPE,
          owner: theCase.owner,
          attachmentId: id,
          metadata: {
            title,
            ...(actor?.username ? { linkedBy: actor.username } : {}),
          },
        })),
      });

      // The investigations' chats ride along as conversation attachments, so the case lists them
      // (Attachments, and the room's list of chats). Best effort: Cases may have chat turned off.
      try {
        await casesClient.attachments.bulkCreate({
          caseId: theCase.id,
          attachments: toLink.map(({ id }) => ({
            type: AGENT_BUILDER_CONVERSATION_CASE_ATTACHMENT_TYPE,
            owner: theCase.owner,
            attachmentId: id,
          })),
        });
      } catch (error) {
        this.deps.logger.debug(
          `Case ${theCase.id}: the linked investigations' chats weren't attached: ${toMessage(
            error
          )}`
        );
      }

      for (const { id } of toLink) {
        try {
          // Lock it down before anything names the case on it.
          if (isRestricted(theCase)) {
            await this.applyCaseAccess(request, id, theCase);
          }
          await conversations.patchMetadata(id, { case_id: theCase.id }, { access: 'converse' });
          const data: InvestigationLinkedToCaseEventData = {
            case_id: theCase.id,
            case_title: theCase.title,
            ...(openedFromId === id ? { opened_from_here: true } : {}),
          };
          await conversations.addEvents({
            conversationId: id,
            events: [{ type: INVESTIGATION_LINKED_TO_CASE_EVENT_TYPE, data }],
          });
          results.set(id, { id });
        } catch (error) {
          this.deps.logger.warn(
            `Linked investigation ${id} to case ${
              theCase.id
            }, but updating the investigation failed: ${toMessage(error)}`
          );
          results.set(id, { id, error: toMessage(error) });
        }
      }
    }

    return investigationIds.map((id) => results.get(id) ?? { id });
  }

  /**
   * The case is authoritative for its linked investigations' visibility: a restricted case makes
   * them private to its assignees, any other case makes them public again.
   */
  private async applyCaseAccess(
    request: KibanaRequest,
    investigationId: string,
    theCase: Pick<BridgeCase, 'access' | 'assignees'>
  ): Promise<void> {
    const conversations = await this.getConversationClient(request);
    const actor = this.deps.getActor(request);
    await conversations.updateAccessControlAsOwner(
      investigationId,
      isRestricted(theCase)
        ? {
            access_mode: ConversationAccessControlMode.Private,
            entries: theCase.assignees.map(({ uid }) => ({
              type: 'user' as const,
              id: uid,
              role: ConversationAccessControlRole.Member,
            })),
          }
        : { access_mode: ConversationAccessControlMode.Public, entries: [] },
      actor ? { actor } : undefined
    );
  }

  /**
   * Links that reach the case by another path than Open a case or Add to existing case (the Cases
   * attachments API, a workflow, or an agent tool) still get the investigation's back-link, the
   * timeline event, and the case's access. Investigations that already name the case are skipped,
   * so the bridge's own links aren't written twice.
   */
  async onInvestigationsAttached({
    request,
    caseId,
    attachmentIds,
  }: {
    request: KibanaRequest;
    caseId: string;
    attachmentIds: string[];
  }): Promise<void> {
    const casesClient = await this.requireCases().getCasesClientWithRequest(request);
    const theCase = await casesClient.cases.get({ id: caseId, includeComments: false });
    const { attachments } = await casesClient.attachments.bulkGet({
      caseID: caseId,
      savedObjectIds: attachmentIds,
    });
    const investigationIds = attachments.flatMap((attachment) =>
      attachment.type === INVESTIGATION_CASE_ATTACHMENT_TYPE &&
      'attachmentId' in attachment &&
      typeof attachment.attachmentId === 'string' &&
      // The bridge's own links (Open a case, Add to existing case) carry linkedBy and are fully
      // handled by linkInvestigations; this event can arrive before it finishes.
      !(attachment.metadata as { linkedBy?: string } | null | undefined)?.linkedBy
        ? [attachment.attachmentId]
        : []
    );
    if (investigationIds.length === 0) return;

    const conversations = await this.getConversationClient(request);
    for (const id of investigationIds) {
      try {
        const investigation = await conversations.get(id);
        if (
          investigation.template_id !== INVESTIGATION_TEMPLATE_ID ||
          investigation.metadata?.case_id === caseId
        ) {
          continue;
        }
        const linkedCaseId = investigation.metadata?.case_id;
        if (typeof linkedCaseId === 'string' && linkedCaseId.length > 0) {
          this.deps.logger.warn(
            new InvestigationAlreadyLinkedError(id, linkedCaseId).message +
              ` It was also attached to case ${caseId}; its back-link still names case ${linkedCaseId}.`
          );
          continue;
        }
        // A restricted case takes over the investigation's access, which skips Agent Builder's
        // owner check, so off the bridge's own path only the investigation's owner may do that.
        // A linked investigation's access follows its case, which skips Agent Builder's owner
        // check, so off the bridge's own (manage-gated) path only the investigation's owner may
        // link it back, whether or not the case is restricted yet.
        if (!investigation.permissions?.update_access_control) {
          this.deps.logger.warn(
            `Investigation ${id} was attached to case ${caseId} by someone who doesn't own it, so it wasn't linked back.`
          );
          continue;
        }
        if (isRestricted(theCase)) {
          // Lock it down before anything names the case on it.
          await this.applyCaseAccess(request, id, theCase);
        }
        await conversations.patchMetadata(id, { case_id: caseId }, { access: 'converse' });
        const data: InvestigationLinkedToCaseEventData = {
          case_id: caseId,
          case_title: theCase.title,
        };
        await conversations.addEvents({
          conversationId: id,
          events: [{ type: INVESTIGATION_LINKED_TO_CASE_EVENT_TYPE, data }],
        });
        await casesClient.attachments
          .bulkCreate({
            caseId,
            attachments: [
              {
                type: AGENT_BUILDER_CONVERSATION_CASE_ATTACHMENT_TYPE,
                owner: theCase.owner,
                attachmentId: id,
              },
            ],
          })
          .catch((error) =>
            this.deps.logger.debug(
              `Case ${caseId}: chat of ${id} not attached: ${toMessage(error)}`
            )
          );
      } catch (error) {
        this.deps.logger.warn(
          `Investigation ${id} was attached to case ${caseId}, but its back-link wasn't written: ${toMessage(
            error
          )}`
        );
      }
    }
  }

  async getLinkedInvestigationIds(request: KibanaRequest, caseId: string): Promise<string[]> {
    const casesClient = await this.requireCases().getCasesClientWithRequest(request);
    const found = await casesClient.attachments.find({
      caseID: caseId,
      findQueryParams: { type: INVESTIGATION_CASE_ATTACHMENT_TYPE, perPage: 100 },
    });
    if (found.total > found.data.length) {
      this.deps.logger.warn(
        `Case ${caseId} links ${found.total} investigations; only the first ${found.data.length} follow its status and access`
      );
    }
    const ids = new Set<string>();
    for (const attachment of found.data) {
      const attachmentId = 'attachmentId' in attachment ? attachment.attachmentId : undefined;
      if (typeof attachmentId === 'string') {
        ids.add(attachmentId);
      }
    }
    return [...ids];
  }

  /**
   * Runs for every case update (UI, API, workflow, agent): the Cases event bus carries the request
   * of whoever made the change, so investigations close, reopen, and change visibility as that
   * person. Failures are logged per investigation and never fail the case update.
   */
  async onCaseUpdated({
    request,
    previousCase,
    updatedCase,
    closeLinkedInvestigations,
  }: {
    request: KibanaRequest;
    previousCase: BridgeCase;
    updatedCase: BridgeCase;
    closeLinkedInvestigations?: boolean;
  }): Promise<void> {
    const wasClosed = previousCase.status === 'closed';
    const isClosed = updatedCase.status === 'closed';
    const closing = !wasClosed && isClosed && closeLinkedInvestigations !== false;
    const reopening = wasClosed && !isClosed;
    const accessChanged =
      (previousCase.access?.mode ?? 'default') !== (updatedCase.access?.mode ?? 'default') ||
      (isRestricted(updatedCase) && !sameMembers(previousCase.assignees, updatedCase.assignees));

    if (!closing && !reopening && !accessChanged) {
      return;
    }

    let investigationIds: string[];
    try {
      investigationIds = await this.getLinkedInvestigationIds(request, updatedCase.id);
    } catch (error) {
      this.deps.logger.warn(
        `Couldn't read the investigations linked to case ${updatedCase.id}: ${toMessage(error)}`
      );
      return;
    }
    if (investigationIds.length === 0) {
      return;
    }

    const conversations = await this.getConversationClient(request);
    // Access follows the case only for someone who could link it through the bridge's routes:
    // `case_id` is an ordinary investigation field, so a member could point it at their own case.
    const mayChangeAccess = accessChanged && (await this.deps.canManageInvestigations(request));
    if (accessChanged && !mayChangeAccess) {
      this.deps.logger.warn(
        `Case ${updatedCase.id} changed access, but the person who changed it can't manage investigations, so its linked investigations keep theirs.`
      );
    }
    for (const id of investigationIds) {
      try {
        // The attachment alone is not trusted: Cases' attachment update path doesn't re-run the
        // type's resolve, so its id could point anywhere. Only an investigation whose own case_id
        // names this case (written by the link routes, which check the manage privilege) follows it.
        if (!(await isLinkedTo(conversations, id, updatedCase.id))) {
          this.deps.logger.debug(
            `Skipping ${id} for case ${updatedCase.id}: it is not an investigation linked to this case`
          );
          continue;
        }
        if (mayChangeAccess) {
          await this.applyCaseAccess(request, id, updatedCase);
        }
        if (closing) {
          await this.closeInvestigation(request, id, updatedCase);
        } else if (reopening) {
          await this.reopenInvestigation(request, id);
        }
      } catch (error) {
        this.deps.logger.warn(
          `Case ${
            updatedCase.id
          } changed, but updating linked investigation ${id} failed: ${toMessage(error)}`
        );
      }
    }
    if (closing || reopening) {
      await this.deps.onLinkedInvestigationsUpdated?.(request, updatedCase.id);
    }
  }

  private async closeInvestigation(
    request: KibanaRequest,
    id: string,
    theCase: BridgeCase
  ): Promise<void> {
    const statusService = this.deps.getInvestigationStatusService();
    const conversations = await this.getConversationClient(request);
    const investigation = await conversations.get(id);
    if (investigation.metadata?.status === 'closed') {
      return;
    }
    const preview = await statusService.getPreview(request, id);
    const pendingIds = preview.pending_proposals.map(({ id: proposalId }) => proposalId);
    await statusService.setStatus(request, id, {
      status: 'closed',
      expected_proposal_ids: pendingIds,
      ...(pendingIds.length > 0
        ? {
            dismiss_reason: 'handled_elsewhere' as const,
            rationale: `Closed with case ${describeCase(theCase)}`,
          }
        : {}),
    });
  }

  private async reopenInvestigation(request: KibanaRequest, id: string): Promise<void> {
    const conversations = await this.getConversationClient(request);
    const investigation = await conversations.get(id);
    if (investigation.metadata?.status !== 'closed') {
      return;
    }
    await this.deps.getInvestigationStatusService().setStatus(request, id, { status: 'open' });
  }

  /**
   * The reverse of case close, behind an advanced setting that is off by default: when the last
   * open investigation linked to a case closes, the case closes too.
   */
  async closeCaseIfAllInvestigationsClosed(
    request: KibanaRequest,
    investigationId: string
  ): Promise<void> {
    const conversations = await this.getConversationClient(request);
    const investigation = await conversations.get(investigationId);
    const caseId = investigation.metadata?.case_id;
    if (typeof caseId !== 'string' || caseId.length === 0) {
      return;
    }
    const casesClient = await this.requireCases().getCasesClientWithRequest(request);
    const theCase = await casesClient.cases.get({ id: caseId });
    if (theCase.status === 'closed') {
      return;
    }
    const ids = await this.getLinkedInvestigationIds(request, caseId);
    // An investigation whose link was removed from the case no longer closes it.
    if (!ids.includes(investigationId)) {
      return;
    }
    const linked = await conversations.bulkGet(ids);
    const allClosed = ids.every((id) => linked.get(id)?.metadata?.status === 'closed');
    if (!allClosed) {
      return;
    }
    await casesClient.cases.bulkUpdate({
      cases: [{ id: theCase.id, version: theCase.version, status: 'closed' as Case['status'] }],
    });
  }
}

const isLinkedTo = async (
  conversations: ConversationPublicClient,
  investigationId: string,
  caseId: string
): Promise<boolean> => {
  try {
    const investigation = await conversations.get(investigationId);
    return (
      investigation.template_id === INVESTIGATION_TEMPLATE_ID &&
      investigation.metadata?.case_id === caseId
    );
  } catch {
    // Not readable by the person who changed the case: leave it alone.
    return false;
  }
};

const sameMembers = (a: Array<{ uid: string }>, b: Array<{ uid: string }>): boolean => {
  const left = new Set(a.map(({ uid }) => uid));
  const right = new Set(b.map(({ uid }) => uid));
  return left.size === right.size && [...left].every((uid) => right.has(uid));
};

export const getEventActorForUser = (
  user: { username?: string; full_name?: string | null; profile_uid?: string } | null | undefined
): EventActor | undefined =>
  user?.username
    ? {
        type: EventActorType.user,
        id: user.profile_uid ?? user.username,
        username: user.username,
        ...(user.full_name ? { full_name: user.full_name } : {}),
      }
    : undefined;
