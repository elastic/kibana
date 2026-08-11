/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** Form ID constant - only one rule form should exist at a time */
export const RULE_FORM_ID = 'ruleV2Form';

export const DEFAULT_RULE_NAME = i18n.translate('xpack.alertingV2.ruleForm.defaultRuleName', {
  defaultMessage: 'Untitled rule',
});
