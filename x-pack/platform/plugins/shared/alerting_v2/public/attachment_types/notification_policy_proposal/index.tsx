/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { HttpStart, ApplicationStart, NotificationsStart } from '@kbn/core/public';
import type { WorkflowsPublicPluginStart } from '@kbn/workflows-management-plugin/public';
import {
  NOTIFICATION_POLICY_TYPE,
  type NotificationPolicyAttachment,
} from '../../../common/attachment_types';
import { NotificationPolicyInlineContent } from './inline_content';
import { NotificationPolicyCanvasContent } from './canvas_content';

export const registerNotificationPolicyProposalAttachment = ({
  agentBuilder,
  application,
  http,
  notifications,
  workflowsManagement,
}: {
  agentBuilder: AgentBuilderPluginStart;
  application: ApplicationStart;
  http: HttpStart;
  notifications: NotificationsStart;
  workflowsManagement: WorkflowsPublicPluginStart;
}) => {
  const WorkflowEditor = workflowsManagement.getWorkflowEditor();

  agentBuilder.attachments.addAttachmentType<NotificationPolicyAttachment>(
    NOTIFICATION_POLICY_TYPE,
    {
      getLabel: (attachment) => attachment.data?.name ?? 'Notification Policy',
      getIcon: () => 'bell',
      renderInlineContent: (props) => <NotificationPolicyInlineContent {...props} />,
      renderCanvasContent: (props, callbacks) => (
        <NotificationPolicyCanvasContent
          {...props}
          http={http}
          notifications={notifications}
          application={application}
          closeCanvas={callbacks.closeCanvas}
          openSidebarConversation={callbacks.openSidebarConversation}
          WorkflowEditor={WorkflowEditor}
        />
      ),
      getActionButtons: ({ openCanvas, isCanvas }) => {
        if (isCanvas) {
          return [];
        }

        const buttons = [];

        if (openCanvas) {
          buttons.push({
            label: i18n.translate(
              'xpack.alertingVTwo.attachments.notificationPolicy.previewLabel',
              { defaultMessage: 'Preview' }
            ),
            icon: 'eye',
            type: ActionButtonType.SECONDARY,
            handler: () => openCanvas(),
          });
        }

        return buttons;
      },
    }
  );
};
