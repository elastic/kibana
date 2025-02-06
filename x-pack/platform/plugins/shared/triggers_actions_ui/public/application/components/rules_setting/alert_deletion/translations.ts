/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const DAYS_LABEL = i18n.translate(
  'xpack.triggersActionsUI.rulesSettings.modal.alertDeletionThresholdUnitLabel',
  {
    defaultMessage: 'Days',
  }
);

export const THRESHOLD_LABEL = i18n.translate(
  'xpack.triggersActionsUI.rulesSettings.modal.alertDeletionThresholdFieldLabel',
  {
    defaultMessage: 'Threshold',
  }
);

export const ACTIVE_ALERT_DELETION_LABEL = i18n.translate(
  'xpack.triggersActionsUI.rulesSettings.modal.activeAlertDeletionLabel',
  {
    defaultMessage: 'Active alert deletion',
  }
);

export const ALERT_DELETION_ERROR_PROMPT_BODY = i18n.translate(
  'xpack.triggersActionsUI.rulesSettings.modal.alertDeletionErrorPromptBody',
  {
    defaultMessage: 'Error body',
  }
);

export const INACTIVE_ALERT_DELETION_LABEL = i18n.translate(
  'xpack.triggersActionsUI.rulesSettings.modal.inactiveAlertDeletionLabel',
  {
    defaultMessage: 'Inactive alert deletion',
  }
);

export const ALERT_DELETION_ERROR_PROMPT_TITLE = i18n.translate(
  'xpack.triggersActionsUI.rulesSettings.modal.alertDeletionErrorPromptTitle',
  {
    defaultMessage: 'Error title',
  }
);

export const ALERT_DELETION_TITLE = i18n.translate(
  'xpack.triggersActionsUI.rulesSettings.modal.alertDeletionTitle',
  {
    defaultMessage: 'Alert deletion',
  }
);

export const ALERT_DELETION_DESCRIPTION = i18n.translate(
  'xpack.triggersActionsUI.rulesSettings.modal.alertDeletionDescription',
  {
    defaultMessage:
      'Clean up alert history by removing old active alerts and long-inactive alerts based on customizable time thresholds.',
  }
);

export const ALERT_DELETION_LAST_RUN = i18n.translate(
  'xpack.triggersActionsUI.rulesSettings.modal.alertDeletionLastRun',
  {
    defaultMessage: `Current settings would delete N alerts in total.`,
  }
);
