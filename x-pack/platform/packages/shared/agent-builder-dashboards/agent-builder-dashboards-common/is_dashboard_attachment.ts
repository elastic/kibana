/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { DASHBOARD_ATTACHMENT_TYPE } from './constants';
import type { DashboardAttachmentData } from './types';

export const isDashboardAttachment = (
  attachment: VersionedAttachment
): attachment is VersionedAttachment<typeof DASHBOARD_ATTACHMENT_TYPE, DashboardAttachmentData> =>
  attachment.type === DASHBOARD_ATTACHMENT_TYPE;
