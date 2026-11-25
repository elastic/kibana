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
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { AnalyticsServiceStart } from '@kbn/core/public';
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
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown-schemas';
import type { DashboardApi, DashboardStart } from '@kbn/dashboard-plugin/public';
import { ADD_TO_CHAT_ACTION_ID } from '@kbn/embeddable-plugin/public';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import {
  apiHasParentApi,
  apiHasType,
  apiHasUniqueId,
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
  stagedDashboards: StagedDashboards;
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
    stagedDashboards,
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
          request_id: uuidv4(),
        },
      });

      const activeConversation = await getActiveConversation();
      const conversationDashboards =
        activeConversation?.conversation?.attachments?.filter(isDashboardAttachment) ?? [];
      const { origin, attachment: linkedAttachment } = resolveDashboardAttachmentLink({
        api: dashboardApi,
        canWriteDashboards,
        attachments: conversationDashboards,
        isStagedFromSavedDashboard: stagedDashboards.isStagedFromSavedDashboard,
      });
      // an unlinked dashboard, e.g. a managed one, points at the copy it already sent, because the
      // chat skips a dashboard input whose content it already stores; a copy the dashboard has
      // since diverged from, e.g. by its filters, is staged again so the agent reads the current one
      const sentCandidate = linkedAttachment
        ? undefined
        : conversationDashboards.findLast(
            (attachment) =>
              stagedDashboards.isStagedFrom(attachment.id, dashboardApi) &&
              hasPanel(attachment, embeddable.uuid)
          );
      const sentData = sentCandidate && getLatestVersion(sentCandidate)?.data;
      const sentAttachment =
        sentData &&
        (await isAttachmentShownInDashboard({ areEqual, dashboardState, data: sentData }))
          ? sentCandidate
          : undefined;

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
