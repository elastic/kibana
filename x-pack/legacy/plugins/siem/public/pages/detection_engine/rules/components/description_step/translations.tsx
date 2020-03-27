/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const FILTERS_LABEL = i18n.translate('xpack.siem.detectionEngine.createRule.filtersLabel', {
  defaultMessage: 'Filters',
});

export const QUERY_LABEL = i18n.translate('xpack.siem.detectionEngine.createRule.QueryLabel', {
  defaultMessage: 'Custom query',
});

export const SAVED_ID_LABEL = i18n.translate('xpack.siem.detectionEngine.createRule.savedIdLabel', {
  defaultMessage: 'Saved query name',
});

export const ML_TYPE_DESCRIPTION = i18n.translate(
  'xpack.siem.detectionEngine.createRule.mlRuleTypeDescription',
  {
    defaultMessage: 'Machine Learning',
  }
);

export const QUERY_TYPE_DESCRIPTION = i18n.translate(
  'xpack.siem.detectionEngine.createRule.queryRuleTypeDescription',
  {
    defaultMessage: 'Query',
  }
);

export const ML_JOB_STARTED = i18n.translate(
  'xpack.siem.detectionEngine.ruleDescription.mlJobStartedDescription',
  {
    defaultMessage: 'Started',
  }
);

export const ML_JOB_STOPPED = i18n.translate(
  'xpack.siem.detectionEngine.ruleDescription.mlJobStoppedDescription',
  {
    defaultMessage: 'Stopped',
  }
);
