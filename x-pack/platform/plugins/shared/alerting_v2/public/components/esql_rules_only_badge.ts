/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderBadge } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';

const ESQL_RULES_ONLY_LABEL = i18n.translate('xpack.alertingV2.esqlRulesOnlyBadge.label', {
  defaultMessage: 'ES|QL rules only',
});

export const esqlRulesOnlyBadge: AppHeaderBadge = {
  label: ESQL_RULES_ONLY_LABEL,
  color: 'hollow',
  'data-test-subj': 'alertingV2EsqlRulesOnlyBadge',
};
