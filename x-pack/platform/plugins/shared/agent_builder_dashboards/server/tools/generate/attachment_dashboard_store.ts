/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { ToolEventEmitter } from '@kbn/agent-builder-server';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/agent-builder-dashboards-common';
import { DASHBOARD_UPDATED_UI_EVENT, type DashboardUpdatedUiEventData } from '../../../common';
import { retrieveLatestVersion } from './attachment_state';
import type { DashboardStore } from './dashboard_store';
import { createAttachmentPanelResolver } from './resolvers/attachment_panel_resolver';

interface AttachmentDashboardStoreDeps {
  attachments: AttachmentStateManager;
  events: ToolEventEmitter;
}

export const createAttachmentDashboardStore = ({
  attachments,
  events,
}: AttachmentDashboardStoreDeps): DashboardStore => ({
  load: async (dashboardId) => {
    const latestVersion = retrieveLatestVersion(attachments, dashboardId);
    if (!latestVersion) {
      throw new Error(`Dashboard attachment "${dashboardId}" not found.`);
    }
    return {
      id: dashboardId,
      data: latestVersion.data,
      reference: { attachment_id: dashboardId, version: latestVersion.version },
    };
  },
  save: async (data, existing) => {
    const id = existing?.id ?? uuidv4();
    const description = `Dashboard: ${data.title}`;
    const attachment = existing
      ? await attachments.update(id, { data, description })
      : await attachments.add({ id, type: DASHBOARD_ATTACHMENT_TYPE, description, data });

    if (!attachment) {
      throw new Error(`Failed to persist dashboard attachment "${id}".`);
    }

    events.sendUiEvent<typeof DASHBOARD_UPDATED_UI_EVENT, DashboardUpdatedUiEventData>(
      DASHBOARD_UPDATED_UI_EVENT,
      {
        attachment: {
          id: attachment.id,
          type: DASHBOARD_ATTACHMENT_TYPE,
          data,
          origin: attachment.origin,
        },
      }
    );

    return { attachment_id: attachment.id, version: attachment.current_version ?? 1 };
  },
  resolveAttachmentPanel: createAttachmentPanelResolver({ attachments }),
});
