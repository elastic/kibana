/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { v4 as uuidv4 } from 'uuid';
import { createOriginSyncSubscription } from './origin_sync_subscription';
import { serializeDashboardAttachment } from './serialize_dashboard_attachment';

type PendingDashboardAttachment = NonNullable<ReturnType<typeof serializeDashboardAttachment>>;

export interface ActivatePendingAttachmentSessionParams {
  api: DashboardApi;
  agentBuilder: AgentBuilderPluginStart;
  onOriginChange: (params: {
    attachmentId: string;
    attachment: PendingDashboardAttachment;
    origin: string;
  }) => void;
}

export interface ActivatePendingAttachmentSessionResult {
  attachmentId: string;
  attachment: PendingDashboardAttachment;
  originSyncSubscription: Subscription;
}

export const activatePendingAttachmentSession = ({
  api,
  agentBuilder,
  onOriginChange,
}: ActivatePendingAttachmentSessionParams): ActivatePendingAttachmentSessionResult | undefined => {
  const attachmentId = uuidv4();
  const initialOrigin = api.savedObjectId$.getValue();

  const attachment = serializeDashboardAttachment({
    api,
    attachmentId,
    origin: initialOrigin,
  });
  if (!attachment || !attachment.data) {
    return undefined;
  }

  agentBuilder.addAttachment(attachment);

  const originSyncSubscription = createOriginSyncSubscription({
    api,
    attachmentOrigin: initialOrigin,
    onOriginChange: (origin) => {
      const updatedAttachment = serializeDashboardAttachment({
        api,
        attachmentId,
        origin,
      });

      if (!updatedAttachment) {
        return;
      }

      agentBuilder.addAttachment(updatedAttachment);
      onOriginChange({
        attachmentId,
        attachment: updatedAttachment,
        origin,
      });
    },
  });

  return {
    attachmentId,
    attachment,
    originSyncSubscription,
  };
};
