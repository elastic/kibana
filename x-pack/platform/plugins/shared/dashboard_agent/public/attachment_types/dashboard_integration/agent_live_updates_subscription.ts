/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, type Subscription } from 'rxjs';
import { isRoundCompleteEvent } from '@kbn/agent-builder-common';
import { ATTACHMENT_REF_OPERATION, getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common';
import { attachmentDataToDashboardState, isDashboardAttachment } from '@kbn/dashboard-agent-common';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';

export interface AgentLiveUpdatesSubscriptionParams {
  agentBuilder: AgentBuilderPluginStart;
  api: DashboardApi;
  setAttachments: (attachments: DashboardAttachment[]) => void;
}

/**
 * Creates a subscription that applies LLM-driven dashboard attachment updates
 * to the dashboard currently open in the app.
 */
export const createAgentLiveUpdatesSubscription = ({
  agentBuilder,
  api,
  setAttachments,
}: AgentLiveUpdatesSubscriptionParams): Subscription =>
  agentBuilder.events.chat$.pipe(filter(isRoundCompleteEvent)).subscribe((event) => {
    const dashboardAttachments = event.data.attachments?.filter(isDashboardAttachment) ?? [];
    const incomingAttachments = dashboardAttachments.filter((attachment) => {
      return (
        event.data.round.input.attachment_refs?.some(
          (ref) =>
            ref.attachment_id === attachment.id &&
            (ref.operation === ATTACHMENT_REF_OPERATION.updated ||
              ref.operation === ATTACHMENT_REF_OPERATION.created)
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

    const currentSavedObjectId = api.savedObjectId$.getValue();

    // Skip if viewing a saved dashboard that differs from the attachment's linked dashboard
    if (currentSavedObjectId && incomingAttachment.origin !== currentSavedObjectId) {
      return;
    }

    const latestVersionData = getLatestVersion(incomingAttachment)?.data;

    if (!latestVersionData) {
      return;
    }

    api.setState(attachmentDataToDashboardState(latestVersionData));
  });
