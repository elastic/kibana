/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const WORKFLOW_OPTIONS = [
  { value: 'workflow-1', text: 'Slack notification workflow' },
  { value: 'workflow-2', text: 'PagerDuty escalation workflow' },
  { value: 'workflow-3', text: 'Email digest workflow' },
];

export const FREQUENCY_OPTIONS = [
  {
    value: 'immediate',
    text: i18n.translate('xpack.alertingV2.notificationPolicy.form.frequency.immediate', {
      defaultMessage: 'Immediate',
    }),
  },
  {
    value: 'throttle',
    text: i18n.translate('xpack.alertingV2.notificationPolicy.form.frequency.throttle', {
      defaultMessage: 'Throttle',
    }),
  },
];

export const THROTTLE_INTERVAL_PATTERN = /^[1-9][0-9]*[dhms]$/;
