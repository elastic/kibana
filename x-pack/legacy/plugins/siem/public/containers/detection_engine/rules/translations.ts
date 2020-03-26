/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const RULE_FETCH_FAILURE = i18n.translate('xpack.siem.containers.detectionEngine.rules', {
  defaultMessage: 'Failed to fetch Rules',
});

export const RULE_ADD_FAILURE = i18n.translate(
  'xpack.siem.containers.detectionEngine.addRuleFailDescription',
  {
    defaultMessage: 'Failed to add Rule',
  }
);

export const RULE_PREPACKAGED_FAILURE = i18n.translate(
  'xpack.siem.containers.detectionEngine.createPrePackagedRuleFailDescription',
  {
    defaultMessage: 'Failed to installed pre-packaged rules from elastic',
  }
);

export const RULE_PREPACKAGED_SUCCESS = i18n.translate(
  'xpack.siem.containers.detectionEngine.createPrePackagedRuleSuccesDescription',
  {
    defaultMessage: 'Installed pre-packaged rules from elastic',
  }
);

export const TAG_FETCH_FAILURE = i18n.translate(
  'xpack.siem.containers.detectionEngine.tagFetchFailDescription',
  {
    defaultMessage: 'Failed to fetch Tags',
  }
);
