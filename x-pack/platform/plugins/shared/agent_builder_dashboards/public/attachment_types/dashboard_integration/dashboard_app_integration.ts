/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { debounceTime, filter, merge, Observable, switchMap, tap } from 'rxjs';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { UpdateOriginResponse } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import type {
  DashboardAttachment,
  DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common/types';
import {
  isDashboardAttachment,
  DASHBOARD_ATTACHMENT_TYPE,
} from '@kbn/agent-builder-dashboards-common';
import { isEqual } from 'lodash';
import {
  getDashboardSnapshot,
  isAttachmentShownInDashboard,
  MANUAL_CHANGES_DEBOUNCE_MS,
  type DashboardSnapshot,
} from './apply_attachment';
import { toShownVersionKey, type AppliedAttachmentsStore } from './applied_attachments_store';
import { createAgentLiveUpdatesSubscription } from './agent_live_updates_subscription';
import { createOriginSyncSubscription } from './origin_sync_subscription';
import { getLinkedAttachment } from './linked_attachment';
import type { IdGenerator } from '..';

export interface DashboardAppIntegrationParams {
  agentBuilder: AgentBuilderPluginStart;
  api: DashboardApi;
  draftAttachmentId: IdGenerator;
  appliedAttachments: AppliedAttachmentsStore;
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
  /** Tells the user the agent changed a dashboard other than the open one. */
  notifyOtherDashboardUpdated: (attachment: DashboardAttachment) => void;
  /** Tells the user an agent update could not be applied to the open dashboard. */
  notifyApplyError: (error: Error) => void;
}

type VersionedDashboardAttachment = VersionedAttachment<
  typeof DASHBOARD_ATTACHMENT_TYPE,
  DashboardAttachmentData
>;

interface State {
  versionedAttachments: VersionedDashboardAttachment[];
  /** Agent updates not yet in the conversation, per attachment id. */
  liveUpdates: Map<string, DashboardAttachment>;
  conversationId: string | undefined;
}

const toLatestAttachment = (attachment: VersionedDashboardAttachment): DashboardAttachment[] => {
  const { id, type, origin } = attachment;
  const data = getLatestVersion(attachment)?.data;
  return data ? [{ id, type, origin, data }] : [];
};

export const registerDashboardAppIntegration = ({
  agentBuilder,
  api,
  draftAttachmentId,
  appliedAttachments,
  getUpdateOrigin,
  notifyOtherDashboardUpdated,
  notifyApplyError,
}: DashboardAppIntegrationParams): (() => void) => {
  const state: State = {
    versionedAttachments: [],
    liveUpdates: new Map(),
    conversationId: undefined,
  };

  // the latest version of each conversation attachment, with the agent's updates on top
  const getAttachments = (): DashboardAttachment[] => [
    ...state.versionedAttachments
      .flatMap(toLatestAttachment)
      .filter(({ id }) => !state.liveUpdates.has(id)),
    ...state.liveUpdates.values(),
  ];

  // dashboard data this dashboard staged in the chat input, per attachment id
  const stagedAttachmentData = new Map<string, DashboardAttachmentData>();

  // removes what this dashboard staged in the chat input, except the attachment `keepId`
  const unstage = (keepId?: string) => {
    for (const id of stagedAttachmentData.keys()) {
      if (id !== keepId) {
        stagedAttachmentData.delete(id);
        agentBuilder.removeAttachment(id);
      }
    }
  };

  interface ShownCheck {
    versionedAttachments: VersionedDashboardAttachment[];
    data: DashboardAttachmentData;
  }
  let lastShownCheck: ShownCheck | undefined;

  // every attachment version the open dashboard shows; undefined when neither side changed since
  // the last check, since it compares the dashboard with every version
  const getShownVersions = async (
    dashboard: DashboardSnapshot
  ): Promise<{ check: ShownCheck; shownVersions: Set<string> } | undefined> => {
    const { versionedAttachments } = state;
    if (
      lastShownCheck?.versionedAttachments === versionedAttachments &&
      isEqual(lastShownCheck.data, dashboard.data)
    ) {
      return undefined;
    }
    const versions = versionedAttachments.flatMap(({ id, versions: attachmentVersions }) =>
      attachmentVersions.map(({ version, data }) => ({ key: toShownVersionKey(id, version), data }))
    );
    const shownFlags = await Promise.all(
      versions.map(({ data }) => isAttachmentShownInDashboard(api, dashboard, data))
    );
    return {
      check: { versionedAttachments, data: dashboard.data },
      shownVersions: new Set(
        versions.filter((_, index) => shownFlags[index]).map(({ key }) => key)
      ),
    };
  };

  // the attachment the dashboard's changes become versions of, and whether it shows its latest version
  const getPendingVersionTarget = async (dashboard: DashboardSnapshot) => {
    const linkedAttachment = await getLinkedAttachment({
      api,
      store: appliedAttachments,
      attachments: getAttachments(),
      dashboard,
      draftAttachmentId: draftAttachmentId.current,
    });
    const isLinkedAttachmentShown =
      linkedAttachment !== undefined &&
      (await isAttachmentShownInDashboard(api, dashboard, linkedAttachment.data));
    return { linkedAttachment, isLinkedAttachmentShown };
  };

  // stages the dashboard as a pending version unless it shows the linked attachment's latest version
  const updatePendingVersion = (
    dashboard: DashboardSnapshot,
    {
      linkedAttachment,
      isLinkedAttachmentShown,
    }: Awaited<ReturnType<typeof getPendingVersionTarget>>
  ) => {
    // changes become versions of the linked attachment, otherwise the dashboard is staged as a draft
    const attachmentId = linkedAttachment?.id ?? draftAttachmentId.current;
    appliedAttachments.setLinkedAttachmentId(api, attachmentId);

    if (isLinkedAttachmentShown) {
      unstage();
      return;
    }
    unstage(attachmentId);
    if (isEqual(stagedAttachmentData.get(attachmentId), dashboard.data)) {
      return;
    }

    stagedAttachmentData.set(attachmentId, dashboard.data);
    agentBuilder.addAttachment({
      id: attachmentId,
      // the origin of an attachment already in the conversation is kept, so only a draft takes it
      origin: api.savedObjectId$.getValue(),
      type: DASHBOARD_ATTACHMENT_TYPE,
      data: dashboard.data,
    });
  };

  // compares the dashboard with the conversation; the comparison is async, so it resolves to the
  // sync to perform, which is skipped when a newer comparison started meanwhile
  const compareWithConversation = async (): Promise<(() => void) | undefined> => {
    // the dashboard is still settling after applying an attachment, so its state is not a manual change
    if (appliedAttachments.isApplying()) {
      return undefined;
    }
    const dashboard = getDashboardSnapshot(api);
    const [shown, pendingVersionTarget] = await Promise.all([
      getShownVersions(dashboard),
      getPendingVersionTarget(dashboard),
    ]);
    return () => {
      // an apply started while comparing, so the dashboard compared is already outdated
      if (appliedAttachments.isApplying()) {
        return;
      }
      if (shown) {
        lastShownCheck = shown.check;
        appliedAttachments.setShownVersions(shown.shownVersions);
      }
      updatePendingVersion(dashboard, pendingVersionTarget);
    };
  };

  const conversationChanges$ = agentBuilder.events.ui.activeConversation$.pipe(
    tap((change) => {
      if (!change) {
        state.versionedAttachments = [];
        state.liveUpdates.clear();
        state.conversationId = undefined;
        appliedAttachments.setShownVersions();
        return;
      }

      const { id: conversationId, conversation } = change;
      appliedAttachments.setActiveConversationId(conversationId);
      // switching conversations empties the chat input, so the dashboard has to be staged again
      if (conversationId !== state.conversationId) {
        stagedAttachmentData.clear();
      }

      state.versionedAttachments = conversation?.attachments?.filter(isDashboardAttachment) ?? [];
      state.liveUpdates.clear();
      state.conversationId = conversationId;
      // once the draft is in the conversation, later changes are staged under a new id
      if (state.versionedAttachments.some(({ id }) => id === draftAttachmentId.current)) {
        draftAttachmentId.next();
      }
    }),
    filter(Boolean),
    // syncing waits for the conversation change to propagate, otherwise agent builder's sidebar callbacks are null
    debounceTime(0)
  );

  // an apply ignores the state changes it causes, so compare again once it finished
  const syncSubscription = merge(
    conversationChanges$,
    api.anyStateChange$.pipe(debounceTime(MANUAL_CHANGES_DEBOUNCE_MS)),
    appliedAttachments.applyFinished$
  )
    .pipe(switchMap(() => compareWithConversation()))
    .subscribe((sync) => sync?.());

  const agentLiveUpdatesSubscription = createAgentLiveUpdatesSubscription({
    agentBuilder,
    api,
    appliedAttachments,
    upsertAttachment: (attachment: DashboardAttachment) => {
      state.liveUpdates.set(attachment.id, attachment);
    },
    onOtherDashboardUpdated: notifyOtherDashboardUpdated,
    onApplyError: notifyApplyError,
  });

  const originSyncSubscription = createOriginSyncSubscription({
    api,
    store: appliedAttachments,
    getAttachments,
    updateOrigin: (id: string, origin: string) => getUpdateOrigin(id)?.(origin),
  });

  return () => {
    agentLiveUpdatesSubscription.unsubscribe();
    originSyncSubscription.unsubscribe();
    syncSubscription.unsubscribe();
    appliedAttachments.setShownVersions();
    // the staged dashboard belongs to this dashboard, so drop it from the chat input when leaving;
    // attachments already sent stay in the conversation
    unstage();
  };
};

export const createDashboardAppIntegration$ = (
  params: DashboardAppIntegrationParams
  // this stream is meant to be subscribed to for the side effect of registering the integration, it doesn't emit any values and completes when the integration is unregistered
): Observable<never> => new Observable<never>(() => registerDashboardAppIntegration(params));
