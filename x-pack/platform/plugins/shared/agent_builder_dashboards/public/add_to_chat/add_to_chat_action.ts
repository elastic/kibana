/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, firstValueFrom, take, timeout } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { i18n } from '@kbn/i18n';
import { AGENT_BUILDER_EVENT_TYPES } from '@kbn/agent-builder-common';
import { getLatestVersion, type VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { ActiveConversation, AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { AnalyticsServiceStart, NotificationsStart } from '@kbn/core/public';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  DASHBOARD_PANEL_ATTACHMENT_TYPE,
  DASHBOARD_PANEL_LABEL_MAX_LENGTH,
  dashboardStateToAttachmentData,
  findPanelById,
  getDashboardPanelAttachmentId,
  getPanelLabel,
  isAgentEditablePanel,
  isDashboardAttachment,
  type AttachmentPanel,
  type DashboardAttachmentData,
  type PendingDashboardAttachment,
  type PendingDashboardPanelAttachment,
} from '@kbn/agent-builder-dashboards-common';
import { CUSTOM_CONTENT_EMBEDDABLE_TYPE } from '@kbn/custom-content-common';
import { getAbsoluteTimeRange } from '@kbn/data-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown-schemas';
import type { DashboardApi, DashboardStart } from '@kbn/dashboard-plugin/public';
import { ADD_TO_CHAT_ACTION_ID } from '@kbn/embeddable-plugin/public';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import {
  apiHasParentApi,
  apiHasType,
  apiHasUniqueId,
  apiPublishesTimeslice,
  apiPublishesTitle,
  getTitle,
  type EmbeddableApiContext,
  type HasType,
  type HasTypeDisplayName,
  type HasUniqueId,
} from '@kbn/presentation-publishing';
import type { UiActionsActionDefinition as ActionDefinition } from '@kbn/ui-actions-plugin/public';
import type { IdGenerator, StagedDashboards } from '../attachment_types';
import {
  isAttachmentShownInDashboard,
  resolveDashboardAttachmentLink,
  type AreDashboardStatesEqual,
} from '../attachment_types/dashboard_integration/reconcile';

export const DASHBOARD_PANEL_ADD_TO_CHAT_PATHWAY = 'dashboard_panel';

/** How long to wait for the open conversation to load before staging the dashboard anyway. */
export const CONVERSATION_LOAD_TIMEOUT_MS = 10_000;
const MAX_CONVERSATION_RESOLVE_ATTEMPTS = 3;

export interface DashboardAddToChatActionDeps {
  agentBuilder: Pick<
    AgentBuilderPluginStart,
    'openChat' | 'addAttachment' | 'events' | 'getAgentBuilderAccess'
  >;
  dashboardAppApi$: DashboardStart['dashboardAppClientApi$'];
  analytics: AnalyticsServiceStart;
  areEqual: AreDashboardStatesEqual;
  canWriteDashboards: boolean;
  draftAttachmentId: IdGenerator;
  /** The search session's start time, which panels resolve relative time ranges against. */
  nowProvider: Pick<DataPublicPluginStart['nowProvider'], 'get'>;
  stagedDashboards: StagedDashboards;
  toasts: NotificationsStart['toasts'];
}

type ConversationDashboardAttachment = VersionedAttachment<
  typeof DASHBOARD_ATTACHMENT_TYPE,
  DashboardAttachmentData
>;

/** The dashboard open in the dashboard app, when it holds the panel. */
const getPanelDashboard = (
  embeddable: unknown,
  { dashboardAppApi$ }: DashboardAddToChatActionDeps
): DashboardApi | undefined => {
  const dashboardAppApi = dashboardAppApi$.getValue();
  return dashboardAppApi && apiHasParentApi(embeddable) && embeddable.parentApi === dashboardAppApi
    ? dashboardAppApi
    : undefined;
};

const isDashboardPanel = (embeddable: unknown): embeddable is HasUniqueId & HasType =>
  apiHasUniqueId(embeddable) && apiHasType(embeddable);

const hasTypeDisplayName = (embeddable: unknown): embeddable is HasTypeDisplayName =>
  typeof (embeddable as Partial<HasTypeDisplayName> | null)?.getTypeDisplayName === 'function';

const getFallbackLabel = (embeddable: HasType): string => {
  const { type } = embeddable;
  if (type === CUSTOM_CONTENT_EMBEDDABLE_TYPE) {
    return (
      (hasTypeDisplayName(embeddable) && embeddable.getTypeDisplayName()) ||
      i18n.translate('xpack.agentBuilderDashboards.attachments.dashboardPanel.customPanelLabel', {
        defaultMessage: 'Custom panel',
      })
    );
  }
  if (type === MARKDOWN_EMBEDDABLE_TYPE) {
    return i18n.translate(
      'xpack.agentBuilderDashboards.attachments.dashboardPanel.markdownPanelLabel',
      { defaultMessage: 'Markdown' }
    );
  }
  if (type === LENS_EMBEDDABLE_TYPE) {
    return i18n.translate(
      'xpack.agentBuilderDashboards.attachments.dashboardPanel.visualizationLabel',
      { defaultMessage: 'Visualization' }
    );
  }
  return i18n.translate('xpack.agentBuilderDashboards.attachments.dashboardPanel.label', {
    defaultMessage: 'Dashboard panel',
  });
};

/** Title, else a label derived from the config, else a label for the panel type. */
const getPointerLabel = (
  embeddable: HasUniqueId & HasType,
  panel: AttachmentPanel | undefined
): string => {
  const title = apiPublishesTitle(embeddable) ? getTitle(embeddable) : undefined;
  const derived = panel ? getPanelLabel(panel) : undefined;
  return (title || derived || getFallbackLabel(embeddable)).slice(
    0,
    DASHBOARD_PANEL_LABEL_MAX_LENGTH
  );
};

/** Custom Content panels fetch with the dashboard's full time range, ignoring the time slider. */
const appliesTimeslice = (embeddable: HasType): boolean =>
  embeddable.type !== CUSTOM_CONTENT_EMBEDDABLE_TYPE;

/**
 * The bounds the panel showed, absolute so the agent reads the same data however late the message
 * is sent: the time slider's selection for panels that apply it, else the dashboard's time range
 * resolved against the same `now` as the panel's search.
 */
const getShownTimeRange = ({
  dashboardApi,
  embeddable,
  now,
}: {
  dashboardApi: DashboardApi;
  embeddable: HasType;
  now: Date;
}): { from: string; to: string } | undefined => {
  const timeslice =
    appliesTimeslice(embeddable) && apiPublishesTimeslice(dashboardApi)
      ? dashboardApi.timeslice$.getValue()
      : undefined;
  if (timeslice) {
    const [from, to] = timeslice;
    return { from: new Date(from).toISOString(), to: new Date(to).toISOString() };
  }
  const timeRange = dashboardApi.timeRange$.getValue();
  return timeRange ? getAbsoluteTimeRange(timeRange, { forceNow: now }) : undefined;
};

const hasPanel = (attachment: ConversationDashboardAttachment, panelId: string): boolean => {
  const data = getLatestVersion(attachment)?.data;
  return Boolean(data && findPanelById(data.panels, panelId));
};

const reportClicked = (
  analytics: AnalyticsServiceStart,
  attachmentTypes: readonly string[]
): void => {
  try {
    analytics.reportEvent(AGENT_BUILDER_EVENT_TYPES.AddToChatClicked, {
      pathway: DASHBOARD_PANEL_ADD_TO_CHAT_PATHWAY,
      attachments: [...attachmentTypes],
    });
  } catch {
    // never break the action on telemetry errors
  }
};

/**
 * Sends a pointer to any panel, plus the dashboard when the chat lacks it. The pointer says whether
 * the agent can edit the panel; it can still read, move and copy the others. Without dashboard
 * write access the pointer is read only: the agent answers questions but changes nothing.
 */
export const createDashboardAddToChatAction = (
  deps: DashboardAddToChatActionDeps
): ActionDefinition<EmbeddableApiContext> => {
  const {
    agentBuilder,
    analytics,
    areEqual,
    canWriteDashboards,
    draftAttachmentId,
    nowProvider,
    stagedDashboards,
    toasts,
  } = deps;

  const getPointableDashboard = async (embeddable: unknown): Promise<DashboardApi | undefined> => {
    const dashboardApi = getPanelDashboard(embeddable, deps);
    if (!dashboardApi || !isDashboardPanel(embeddable)) {
      return undefined;
    }
    const { hasRequiredLicense, hasLlmConnector } = await agentBuilder.getAgentBuilderAccess();
    return hasRequiredLicense && hasLlmConnector ? dashboardApi : undefined;
  };

  // an open conversation that is still loading has no attachments to link to yet; one that doesn't
  // load in time gets the dashboard staged anyway
  const getActiveConversation = () => {
    const { activeConversation$ } = agentBuilder.events.ui;
    return firstValueFrom(
      activeConversation$.pipe(
        filter((active) => !active?.id || active.conversation !== undefined),
        timeout({
          first: CONVERSATION_LOAD_TIMEOUT_MS,
          with: () => activeConversation$.pipe(take(1)),
        })
      )
    );
  };
  // the binding as it is now, without waiting for a conversation to load
  const getConversationBinding = () =>
    firstValueFrom(agentBuilder.events.ui.activeConversation$.pipe(take(1)));
  const getAttachmentVersionsKey = (active: ActiveConversation | null | undefined): string =>
    JSON.stringify([
      active?.id,
      active?.conversation?.attachments?.map(({ id, current_version: version }) => [id, version]),
    ]);

  return {
    id: ADD_TO_CHAT_ACTION_ID,
    type: ADD_TO_CHAT_ACTION_ID,
    order: 25,
    getDisplayName: () =>
      i18n.translate('xpack.agentBuilderDashboards.addToChat.displayName', {
        defaultMessage: 'Add to chat',
      }),
    getIconType: () => 'addToChat',
    isCompatible: async ({ embeddable }) => Boolean(await getPointableDashboard(embeddable)),
    execute: async ({ embeddable }) => {
      const dashboardApi = await getPointableDashboard(embeddable);
      if (!dashboardApi || !isDashboardPanel(embeddable)) {
        return;
      }

      const { attributes: dashboardState } = dashboardApi.getSerializedState();
      const dashboardData = dashboardStateToAttachmentData(dashboardState);
      const panel = findPanelById(dashboardData.panels, embeddable.uuid);
      // the dashboard state has a time range only when the dashboard stores one
      const timeRange = getShownTimeRange({ dashboardApi, embeddable, now: nowProvider.get() });
      const buildDashboardAttachment = (
        id: string,
        origin: string | undefined
      ): PendingDashboardAttachment => ({
        id,
        origin,
        type: DASHBOARD_ATTACHMENT_TYPE,
        data: dashboardData,
      });
      const buildPanelPointer = (
        dashboardAttachmentId: string
      ): PendingDashboardPanelAttachment => ({
        id: getDashboardPanelAttachmentId({ dashboardAttachmentId, panelId: embeddable.uuid }),
        type: DASHBOARD_PANEL_ATTACHMENT_TYPE,
        data: {
          dashboard_attachment_id: dashboardAttachmentId,
          panel_id: embeddable.uuid,
          label: getPointerLabel(embeddable, panel),
          // the serialized type, e.g. `vega` for a by-value ES|QL Vega panel the embeddable reports
          // as `visualization`, is the one the agent edits by
          panel_type: panel?.type ?? embeddable.type,
          editable: canWriteDashboards && panel ? isAgentEditablePanel(panel) : false,
          ...(canWriteDashboards ? {} : { read_only: true }),
          ...(timeRange ? { time_range: { from: timeRange.from, to: timeRange.to } } : {}),
          request_id: uuidv4(),
        },
      });

      // an unlinked dashboard, e.g. a managed one, points at a copy it already sent that still matches
      // it, because the chat skips a dashboard input whose content it already stores; a copy the
      // dashboard has since diverged from, e.g. by its filters, is staged again so the agent reads
      // the current one
      const findSentAttachment = async (
        conversationDashboards: ConversationDashboardAttachment[]
      ): Promise<ConversationDashboardAttachment | undefined> => {
        const candidates = conversationDashboards.filter(
          (attachment) =>
            stagedDashboards.isStagedFrom(attachment.id, dashboardApi) &&
            hasPanel(attachment, embeddable.uuid)
        );
        for (const candidate of candidates.toReversed()) {
          const data = getLatestVersion(candidate)?.data;
          if (data && (await isAttachmentShownInDashboard({ areEqual, dashboardState, data }))) {
            return candidate;
          }
        }
      };
      const resolveConversation = async () => {
        const conversation = await getActiveConversation();
        const conversationDashboards =
          conversation?.conversation?.attachments?.filter(isDashboardAttachment) ?? [];
        const link = resolveDashboardAttachmentLink({
          api: dashboardApi,
          canWriteDashboards,
          attachments: conversationDashboards,
          isStagedFromSavedDashboard: stagedDashboards.isStagedFromSavedDashboard,
        });
        const sent = link.attachment ? undefined : await findSentAttachment(conversationDashboards);
        return { conversation, link, sent };
      };

      // the comparison is async: resolve again if the user switched or closed the chat, or its
      // attachments changed, meanwhile, so the pointer never targets a dashboard id of another
      // conversation; gives up rather than staging against a binding that keeps changing
      let resolved: Awaited<ReturnType<typeof resolveConversation>> | undefined;
      for (let attempt = 0; attempt < MAX_CONVERSATION_RESOLVE_ATTEMPTS && !resolved; attempt++) {
        const candidate = await resolveConversation();
        const binding = await getConversationBinding();
        if (
          getAttachmentVersionsKey(binding) === getAttachmentVersionsKey(candidate.conversation)
        ) {
          resolved = candidate;
        }
      }
      if (!resolved) {
        toasts.addWarning({
          title: i18n.translate('xpack.agentBuilderDashboards.addToChat.conversationChangedTitle', {
            defaultMessage: "Couldn't add the panel to the chat",
          }),
          text: i18n.translate('xpack.agentBuilderDashboards.addToChat.conversationChangedText', {
            defaultMessage: 'The conversation changed while the panel was being added. Try again.',
          }),
        });
        return;
      }
      const {
        conversation: activeConversation,
        link: { origin, attachment: linkedAttachment },
        sent: sentAttachment,
      } = resolved;

      let attachments: Array<PendingDashboardAttachment | PendingDashboardPanelAttachment>;
      if (sentAttachment) {
        attachments = [buildPanelPointer(sentAttachment.id)];
      } else {
        // without a linked attachment, e.g. in a new conversation, the dashboard is staged under the
        // draft id, which the dashboard app integration then keeps up to date
        const dashboardAttachmentId =
          linkedAttachment?.id ?? stagedDashboards.getDraftId(draftAttachmentId, dashboardApi);
        // restages a panel added since the dashboard was last staged, e.g. within the reconcile debounce
        const isPanelStaged = Boolean(
          linkedAttachment && hasPanel(linkedAttachment, embeddable.uuid)
        );
        if (!isPanelStaged) {
          stagedDashboards.add(dashboardAttachmentId, dashboardApi);
        }
        stagedDashboards.addPointerTarget(dashboardAttachmentId);
        attachments = [
          ...(isPanelStaged ? [] : [buildDashboardAttachment(dashboardAttachmentId, origin)]),
          buildPanelPointer(dashboardAttachmentId),
        ];
      }

      if (activeConversation) {
        attachments.forEach((attachment) => agentBuilder.addAttachment(attachment));
      } else {
        agentBuilder.openChat({ newConversation: true, sessionTag: 'dashboard', attachments });
      }
      reportClicked(
        analytics,
        attachments.map(({ type }) => type)
      );
    },
  };
};
