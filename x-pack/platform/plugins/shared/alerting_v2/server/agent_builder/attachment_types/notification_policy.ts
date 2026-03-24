/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import {
  NOTIFICATION_POLICY_TYPE,
  notificationPolicyAttachmentDataSchema,
  type NotificationPolicyAttachmentData,
} from '../../../common/attachment_types';

export const createNotificationPolicyType = (): AttachmentTypeDefinition<
  typeof NOTIFICATION_POLICY_TYPE,
  NotificationPolicyAttachmentData
> => ({
  id: NOTIFICATION_POLICY_TYPE,
  isReadonly: false,
  validate: (input) => {
    const result = notificationPolicyAttachmentDataSchema.safeParse(input);
    if (result.success) {
      return { valid: true, data: result.data };
    }
    return { valid: false, error: result.error.message };
  },
  format: (attachment) => ({
    getRepresentation: () => {
      const { data } = attachment;

      const lines: string[] = [
        `Proposed notification policy: "${data.name}" (attachment.id: "${attachment.id}")`,
      ];

      const wf = data.workflow;
      if (wf.source === 'existing') {
        lines.push(`Workflow: ${wf.name} (existing, id: ${wf.id})`);
      } else {
        lines.push(`Workflow: ${wf.name} (new, will be created)`);
        if (wf.connectorTypes?.length) {
          lines.push(`Connectors: ${wf.connectorTypes.join(', ')}`);
        }
      }
      if (data.matcher) {
        lines.push(`Matcher: ${data.matcher}`);
      }
      if (data.groupBy?.length) {
        lines.push(`Group by: ${data.groupBy.join(', ')}`);
      }
      if (data.throttle) {
        lines.push(`Throttle: ${data.throttle.interval}`);
      }
      if (data.description) {
        lines.push(`Description: ${data.description}`);
      }

      return {
        type: 'text',
        value: lines.join('\n'),
      };
    },
  }),
  getAgentDescription: () =>
    'A proposed notification policy with its associated workflow bundled as a single attachment. ' +
    'The Preview button opens a tabbed canvas where the user can review and edit both the ' +
    'notification policy and the workflow, then create both with one click. ' +
    'ALWAYS render these attachments inline using <render_attachment id="ATTACHMENT_ID"/> so the ' +
    'user sees the notification policy proposal card.',
  getTools: () => [],
});
