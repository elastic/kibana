/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NotificationPolicyAttachmentData } from '../../../common/attachment_types';
import type { NotificationPolicyFormState } from '../../components/notification_policy/form/types';

export const mapAttachmentToFormValues = (
  data: NotificationPolicyAttachmentData
): NotificationPolicyFormState => ({
  name: data.name,
  description: data.description,
  matcher: data.matcher ?? '',
  groupBy: data.groupBy ?? [],
  frequency: data.throttle
    ? { type: 'throttle', interval: data.throttle.interval }
    : { type: 'immediate' },
  destinations:
    data.workflow.source === 'existing' ? [{ type: 'workflow', id: data.workflow.id }] : [],
});
