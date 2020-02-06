/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate('xpack.siem.detectionEngine.ruleDetails.pageTitle', {
  defaultMessage: 'Rule details',
});

export const BACK_TO_RULES = i18n.translate(
  'xpack.siem.detectionEngine.ruleDetails.backToRulesDescription',
  {
    defaultMessage: 'Back to signal detection rules',
  }
);

export const EXPERIMENTAL = i18n.translate(
  'xpack.siem.detectionEngine.ruleDetails.experimentalDescription',
  {
    defaultMessage: 'Experimental',
  }
);

export const ACTIVATE_RULE = i18n.translate(
  'xpack.siem.detectionEngine.ruleDetails.activateRuleLabel',
  {
    defaultMessage: 'Activate',
  }
);

export const UNKNOWN = i18n.translate('xpack.siem.detectionEngine.ruleDetails.unknownDescription', {
  defaultMessage: 'Unknown',
});

export const ERROR_CALLOUT_TITLE = i18n.translate(
  'xpack.siem.detectionEngine.ruleDetails.errorCalloutTitle',
  {
    defaultMessage: 'Rule failure at',
  }
);

export const FAILURE_HISTORY_TAB = i18n.translate(
  'xpack.siem.detectionEngine.ruleDetails.failureHistoryTab',
  {
    defaultMessage: 'Failure History',
  }
);

export const LAST_FIVE_ERRORS = i18n.translate(
  'xpack.siem.detectionEngine.ruleDetails.lastFiveErrorsTitle',
  {
    defaultMessage: 'Last five errors',
  }
);

export const COLUMN_STATUS_TYPE = i18n.translate(
  'xpack.siem.detectionEngine.ruleDetails.statusTypeColumn',
  {
    defaultMessage: 'Type',
  }
);

export const COLUMN_FAILED_AT = i18n.translate(
  'xpack.siem.detectionEngine.ruleDetails.statusFailedAtColumn',
  {
    defaultMessage: 'Failed at',
  }
);

export const COLUMN_FAILED_MSG = i18n.translate(
  'xpack.siem.detectionEngine.ruleDetails.statusFailedMsgColumn',
  {
    defaultMessage: 'Failed message',
  }
);

export const TYPE_FAILED = i18n.translate(
  'xpack.siem.detectionEngine.ruleDetails.statusFailedDescription',
  {
    defaultMessage: 'Failed',
  }
);
