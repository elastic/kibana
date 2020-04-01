/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const STATUS = i18n.translate('xpack.siem.detectionEngine.ruleStatus.statusDescription', {
  defaultMessage: 'Last response',
});

export const STATUS_AT = i18n.translate(
  'xpack.siem.detectionEngine.ruleStatus.statusAtDescription',
  {
    defaultMessage: 'at',
  }
);

export const STATUS_DATE = i18n.translate(
  'xpack.siem.detectionEngine.ruleStatus.statusDateDescription',
  {
    defaultMessage: 'Status date',
  }
);

export const REFRESH = i18n.translate('xpack.siem.detectionEngine.ruleStatus.refreshButton', {
  defaultMessage: 'Refresh',
});
