/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertAttachmentData } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';

export const getAlertAttachmentLabel = (
  attachment: Partial<Pick<{ data: AlertAttachmentData }, 'data'>>
): string =>
  attachment.data?.['alert.label'] ??
  i18n.translate('xpack.alertingV2.alertAttachment.fallbackLabel', {
    defaultMessage: 'Alert',
  });
