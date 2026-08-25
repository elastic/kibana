/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const BULK_ACTION_CLOSE_SELECTED = i18n.translate(
  'xpack.responseOps.alertsTable.bulkActions.closeSelectedTitle',
  {
    defaultMessage: 'Mark as closed',
  }
);

export const CLOSING_REASON_MENU_TITLE = i18n.translate(
  'xpack.responseOps.alertsTable.bulkActions.closingReason.menuTitle',
  {
    defaultMessage: 'Reason for closing',
  }
);

export const CLOSING_REASON_BUTTON_MESSAGE = i18n.translate(
  'xpack.responseOps.alertsTable.bulkActions.closingReason.buttonMessage',
  {
    defaultMessage: 'Close alert',
  }
);

export const CLOSING_REASON_DUPLICATE = i18n.translate(
  'xpack.responseOps.alertsTable.defaultClosingReason.duplicate',
  {
    defaultMessage: 'Duplicate',
  }
);

export const CLOSING_REASON_FALSE_POSITIVE = i18n.translate(
  'xpack.responseOps.alertsTable.defaultClosingReason.falsePositive',
  {
    defaultMessage: 'False Positive',
  }
);

export const CLOSING_REASON_CLOSE_WITHOUT_REASON = i18n.translate(
  'xpack.responseOps.alertsTable.defaultClosingReason.closeWithoutReason',
  {
    defaultMessage: 'Close without reason',
  }
);

export const CLOSING_REASON_TRUE_POSITIVE = i18n.translate(
  'xpack.responseOps.alertsTable.defaultClosingReason.truePositive',
  {
    defaultMessage: 'True positive',
  }
);

export const CLOSING_REASON_BENIGN_POSITIVE = i18n.translate(
  'xpack.responseOps.alertsTable.defaultClosingReason.benignPositive',
  {
    defaultMessage: 'Benign positive',
  }
);

export const CLOSING_REASON_OTHER = i18n.translate(
  'xpack.responseOps.alertsTable.defaultClosingReason.other',
  {
    defaultMessage: 'Other',
  }
);

export const CLOSING_REASON_AUTOMATED_CLOSURE = i18n.translate(
  'xpack.responseOps.alertsTable.defaultClosingReason.automatedClosure',
  {
    defaultMessage: 'Automated closure',
  }
);
