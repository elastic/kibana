/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { ALERT_ATTACHMENT_TYPE, type AlertAttachmentData } from '@kbn/alerting-v2-schemas';
import { getAlertAttachmentLabel } from './get_alert_attachment_label';

export { ALERT_ATTACHMENT_TYPE };

export type AlertAttachment = Attachment<typeof ALERT_ATTACHMENT_TYPE, AlertAttachmentData>;

export const createAlertAttachmentDefinition = (): AttachmentUIDefinition<AlertAttachment> => ({
  getLabel: (attachment) => getAlertAttachmentLabel(attachment),
  getIcon: () => 'bell',
});
