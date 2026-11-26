/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  concatMap,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  merge,
  Observable,
  takeWhile,
  tap,
} from 'rxjs';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { UpdateOriginResponse } from '@kbn/agent-builder-common';
import { i18n } from '@kbn/i18n';
import type { NotificationsStart } from '@kbn/core/public';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common/types';
import { dashboardStateToAttachmentData } from '@kbn/agent-builder-dashboards-common';
import {
  CHILDREN_UNSAVED_CHANGES_DEBOUNCE,
  UNSAVED_CHANGES_DEBOUNCE,
} from '@kbn/presentation-publishing';
import { createChatAdapter } from './chat_adapter';
import {
  isAttachmentShownInDashboard,
  isOpenDashboardUpdate,
  reconcileStaging,
  resolveDashboardAttachmentLink,
  type AreDashboardStatesEqual,
} from './reconcile';
import {
  APPLY_AGENT_CHANGES_ERROR_TITLE,
  applyAttachment,
  type ApplyAttachmentOutcome,
} from './show_attachment';
import { createOriginSyncSubscription } from './origin_sync_subscription';
import { createOtherDashboardUpdateNotifier } from './other_dashboard_update_notifier';
import type { DashboardLocator } from './open_in_dashboard_app';
import { handlePreview } from '../handle_preview';
import type { IdGenerator, StagedDashboards } from '..';

/**
 * Layout manager refreshes `getSerializedState()` panel configs only after
 * `UNSAVED_CHANGES_DEBOUNCE` then `CHILDREN_UNSAVED_CHANGES_DEBOUNCE`. Wait that
 * long (+ buffer) so manual sync is not one edit behind.
 */
export const MANUAL_CHANGES_DEBOUNCE_MS =
  UNSAVED_CHANGES_DEBOUNCE + CHILDREN_UNSAVED_CHANGES_DEBOUNCE + 50;

/** The conversation attachment version the open dashboard shows. */
export interface ShownAttachmentVersion {
  attachmentId: string;
  version: number;
}

export interface DashboardAppIntegrationParams {
  agentBuilder: AgentBuilderPluginStart;
  api: DashboardApi;
  areEqual: AreDashboardStatesEqual;
  canWriteDashboards: boolean;
  dashboardLocator?: DashboardLocator;
  toasts: NotificationsStart['toasts'];
  draftAttachmentId: IdGenerator;
  /**
   * Which dashboard each attachment was staged from. Agent changes to a dashboard the user can't
   * edit open in a new dashboard, so such a dashboard is staged without an origin, and this tells
   * which updates are its own.
   */
  stagedDashboards: StagedDashboards;
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
  /** Called with the attachment version the open dashboard shows, `undefined` when it shows none. */
  setShownAttachmentVersion: (shown: ShownAttachmentVersion | undefined) => void;
  /**
   * Lookup for the framework-provided `updateOrigin` callback bound to a specific
   * attachment id. Returns `undefined` when the attachment has not been rendered yet
   * (and thus hasn't registered an updater). Using this callback instead of
   * `agentBuilder.updateAttachmentOrigin` keeps the rendered conversation in sync
   * because it invalidates the conversation query after persisting the new origin.
   */
  getUpdateOrigin: (
    attachmentId: string
  ) => ((origin: string) => Promise<UpdateOriginResponse | undefined>) | undefined;
}

type JobOutcome = ApplyAttachmentOutcome | undefined;

const STAGE_DASHBOARD_ERROR_TITLE = i18n.translate(
  'xpack.agentBuilderDashboards.dashboardIntegration.stageDashboardErrorToastTitle',
  { defaultMessage: "Couldn't add the dashboard to the chat" }
);

export const registerDashboardAppIntegration = ({
  agentBuilder,
  api,
  areEqual,
  canWriteDashboards,
  dashboardLocator,
  toasts,
  draftAttachmentId,
  stagedDashboards,
  checkSavedDashboardExist,
  setShownAttachmentVersion,
  getUpdateOrigin,
}: DashboardAppIntegrationParams): (() => void) => {
  const chat = createChatAdapter({ agentBuilder, draftAttachmentId, getUpdateOrigin });
  // agent updates carry no version until the conversation that has them is published
  let attachments: Array<DashboardAttachment & { version?: number }> | undefined;
  let conversationId: string | undefined;

  const stageOpenDashboard = async () => {
    const { attributes: dashboardState } = api.getSerializedState();
    const { origin, attachment: dashboardAttachment } = resolveDashboardAttachmentLink({
      api,
      canWriteDashboards,
      attachments: attachments ?? [],
      isStagedFromSavedDashboard: stagedDashboards.isStagedFromSavedDashboard,
    });
    const isNewConversation = !conversationId;
    // another dashboard staged under the draft id keeps it, e.g. for a panel pointer to it
    const draftId =
      isNewConversation && !dashboardAttachment
        ? stagedDashboards.getDraftId(draftAttachmentId, api)
        : draftAttachmentId.current;
    const attachmentId = reconcileStaging({
      dashboardAttachmentId: dashboardAttachment?.id,
      isNewConversation,
      isDraftStagedFromDashboard: stagedDashboards.isStagedFrom(draftId, api),
      draftAttachmentId: draftId,
    });
    const isShown = dashboardAttachment
      ? await isAttachmentShownInDashboard({
          areEqual,
          dashboardState,
          data: dashboardAttachment.data,
        })
      : false;
    setShownAttachmentVersion(
      isShown && dashboardAttachment?.version !== undefined
        ? { attachmentId: dashboardAttachment.id, version: dashboardAttachment.version }
        : undefined
    );
    if (!attachmentId) {
      return;
    }
    // the conversation already has what the dashboard shows, e.g. the agent's applied changes
    if (isShown) {
      chat.unstage(attachmentId);
      return;
    }
    stagedDashboards.add(attachmentId, api);
    chat.stage({ id: attachmentId, origin, data: dashboardStateToAttachmentData(dashboardState) });
  };

  // never throws, since a throw would end the integration
  const reconcile = async (): Promise<JobOutcome> => {
    try {
      await stageOpenDashboard();
    } catch (error) {
      toasts.addError(error, { title: STAGE_DASHBOARD_ERROR_TITLE });
    }
    return undefined;
  };

  const otherDashboardUpdateNotifier = createOtherDashboardUpdateNotifier({
    toasts,
    openAttachment: (attachment) =>
      void handlePreview({
        attachment,
        dashboardApi: api,
        canWriteDashboards,
        isSidebar: true,
        dashboardLocator,
        toasts,
        checkSavedDashboardExist,
      }),
  });

  let hasWarnedAboutWritePermission = false;
  const warnAboutWritePermissionOnce = () => {
    if (hasWarnedAboutWritePermission) {
      return;
    }
    hasWarnedAboutWritePermission = true;
    toasts.addWarning({
      title: i18n.translate('xpack.agentBuilderDashboards.applyAgentChanges.notAppliedToastTitle', {
        defaultMessage: "The agent's changes weren't applied",
      }),
      text: i18n.translate('xpack.agentBuilderDashboards.applyAgentChanges.noWritePermissionText', {
        defaultMessage:
          "You don't have permission to edit dashboards. Preview the dashboard attachment in the chat to see the changes.",
      }),
    });
  };

  // never throws, since a throw would end the integration
  const handleAgentUpdate = async (attachment: DashboardAttachment): Promise<JobOutcome> => {
    const isOpenDashboard = isOpenDashboardUpdate({
      attachment,
      dashboardId: api.savedObjectId$.getValue(),
      isStagedFromDashboard: (attachmentId) => stagedDashboards.isStagedFrom(attachmentId, api),
      isStagedFromOtherDashboard: (attachmentId) =>
        stagedDashboards.isStagedFromOtherDashboard(attachmentId, api),
    });
    // without write access, opening another dashboard would show unsaved changes that look saved
    if (!canWriteDashboards) {
      if (isOpenDashboard) {
        warnAboutWritePermissionOnce();
      }
      return undefined;
    }
    if (!isOpenDashboard) {
      otherDashboardUpdateNotifier.notify(attachment);
      return undefined;
    }
    try {
      return await applyAttachment({ attachment, api, dashboardLocator, toasts });
    } catch (error) {
      toasts.addError(error, { title: APPLY_AGENT_CHANGES_ERROR_TITLE });
      return undefined;
    }
  };

  const conversationReconciles$ = chat.conversationChanges$.pipe(
    tap((change) => {
      attachments = change?.attachments;
      conversationId = change?.conversationId;
    }),
    // a new conversation is published again while its first message is sent, before it gets its
    // id, so it needs the dashboard only once
    distinctUntilChanged((previous, current) =>
      Boolean(previous && current && !previous.conversationId && !current.conversationId)
    ),
    filter(Boolean),
    // the chat can only stage attachments once the change of the conversation has propagated
    debounceTime(0),
    map(() => reconcile)
  );

  const dashboardChangeReconciles$ = api.anyStateChange$.pipe(
    debounceTime(MANUAL_CHANGES_DEBOUNCE_MS),
    map(() => reconcile)
  );

  const agentUpdates$ = chat.dashboardUpdates$.pipe(
    tap((attachment) => {
      const otherAttachments = (attachments ?? []).filter(({ id }) => id !== attachment.id);
      attachments = [...otherAttachments, attachment];
    }),
    map((attachment) => () => handleAgentUpdate(attachment))
  );

  // one job at a time, so the dashboard is staged only once the agent's changes are applied, and
  // updates that arrive while a new dashboard opens don't open more
  const integrationSubscription = merge(
    conversationReconciles$,
    dashboardChangeReconciles$,
    agentUpdates$
  )
    .pipe(
      concatMap((job) => job()),
      // the new dashboard replaces this one
      takeWhile((outcome) => outcome !== 'opened-new-dashboard')
    )
    .subscribe();

  const originSyncSubscription = createOriginSyncSubscription({
    api,
    checkSavedDashboardExist,
    getAttachments: () => attachments,
    updateOrigin: chat.updateOrigin,
  });

  return () => {
    integrationSubscription.unsubscribe();
    originSyncSubscription.unsubscribe();
    setShownAttachmentVersion(undefined);
    otherDashboardUpdateNotifier.removeAll();
  };
};

export const createDashboardAppIntegration$ = (
  params: DashboardAppIntegrationParams
  // this stream is meant to be subscribed to for the side effect of registering the integration, it doesn't emit any values and completes when the integration is unregistered
): Observable<never> => new Observable<never>(() => registerDashboardAppIntegration(params));
