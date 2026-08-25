/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY, filter, switchMap, type Subscription } from 'rxjs';
import { isRoundCompleteEvent, isToolUiEvent } from '@kbn/agent-builder-common';
import {
  ATTACHMENT_REF_ACTOR,
  ATTACHMENT_REF_OPERATION,
  getLatestVersion,
  type AttachmentVersionRef,
} from '@kbn/agent-builder-common/attachments';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type {
  DashboardAttachment,
  DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import {
  attachmentDataToDashboardState,
  isDashboardAttachment,
} from '@kbn/agent-builder-dashboards-common';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { DASHBOARD_APPLY_UI_EVENT, type DashboardApplyUiEventData } from '../../../common';

export interface AgentLiveUpdatesSubscriptionParams {
  agentBuilder: AgentBuilderPluginStart;
  api: DashboardApi;
  setAttachments: (attachments: DashboardAttachment[]) => void;
}

const isDashboardMutationOperation = (operation: AttachmentVersionRef['operation']): boolean =>
  operation === ATTACHMENT_REF_OPERATION.updated || operation === ATTACHMENT_REF_OPERATION.created;

const isToolDrivenDashboardRef = (ref: AttachmentVersionRef, attachmentId: string): boolean =>
  ref.attachment_id === attachmentId &&
  isDashboardMutationOperation(ref.operation) &&
  ref.actor !== ATTACHMENT_REF_ACTOR.user;

const applyDashboardDataToApi = ({
  api,
  data,
  origin,
}: {
  api: DashboardApi;
  data: DashboardAttachmentData;
  origin?: string;
}): void => {
  const currentSavedObjectId = api.savedObjectId$.getValue();

  // Skip if viewing a saved dashboard that differs from the attachment's linked dashboard
  if (currentSavedObjectId && origin && origin !== currentSavedObjectId) {
    return;
  }

  api.setState(attachmentDataToDashboardState(data));
};

/**
 * Creates a subscription that applies LLM-driven dashboard attachment updates
 * to the dashboard currently open in the app.
 *
 * Applies on:
 * - `tool_ui` {@link DASHBOARD_APPLY_UI_EVENT} mid-round (live preview while generating)
 * - `round_complete` with agent-driven attachment refs (existing path)
 */
export const createAgentLiveUpdatesSubscription = ({
  agentBuilder,
  api,
  setAttachments,
}: AgentLiveUpdatesSubscriptionParams): Subscription =>
  agentBuilder.events.ui.activeConversation$
    .pipe(
      switchMap((conversation) =>
        conversation?.id ? agentBuilder.events.getChatEvents$(conversation.id) : EMPTY
      ),
      filter(
        (event) =>
          isRoundCompleteEvent(event) ||
          isToolUiEvent<typeof DASHBOARD_APPLY_UI_EVENT, DashboardApplyUiEventData>(
            event,
            DASHBOARD_APPLY_UI_EVENT
          )
      )
    )
    .subscribe((event) => {
      if (
        isToolUiEvent<typeof DASHBOARD_APPLY_UI_EVENT, DashboardApplyUiEventData>(
          event,
          DASHBOARD_APPLY_UI_EVENT
        )
      ) {
        const { data } = event.data.data;
        if (data && typeof data === 'object') {
          applyDashboardDataToApi({
            api,
            data: data as DashboardAttachmentData,
          });
        }
        return;
      }

      if (!isRoundCompleteEvent(event)) {
        return;
      }

      // Ignore hidden drafts from persistAttachment: false generate loops.
      const dashboardAttachments =
        event.data.attachments?.filter(isDashboardAttachment).filter((attachment) => {
          return attachment.hidden !== true;
        }) ?? [];
      const incomingAttachments = dashboardAttachments.filter((attachment) => {
        return (
          event.data.round.input.attachment_refs?.some((ref) =>
            isToolDrivenDashboardRef(ref, attachment.id)
          ) === true
        );
      });

      setAttachments(
        dashboardAttachments
          .map((attachment): DashboardAttachment | undefined => {
            const latestVersionData = getLatestVersion(attachment)?.data;
            return latestVersionData
              ? {
                  id: attachment.id,
                  type: attachment.type,
                  data: latestVersionData,
                  origin: attachment.origin,
                }
              : undefined;
          })
          .filter((attachment): attachment is DashboardAttachment => attachment !== undefined)
      );

      // TODO: we're assuming only one attachment is coming in at a time
      const incomingAttachment = incomingAttachments?.at(0);
      if (!incomingAttachment) {
        return;
      }

      const latestVersionData = getLatestVersion(incomingAttachment)?.data;

      if (!latestVersionData) {
        return;
      }

      applyDashboardDataToApi({
        api,
        data: latestVersionData,
        origin: incomingAttachment.origin,
      });
    });
