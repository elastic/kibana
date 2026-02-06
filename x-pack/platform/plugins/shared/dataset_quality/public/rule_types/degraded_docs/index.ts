/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import { type RuleTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import type { DegradedDocsRuleParams } from '@kbn/response-ops-rule-params/degraded_docs';
import { DEGRADED_DOCS_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import type { GetDescriptionFieldsFn } from '@kbn/triggers-actions-ui-plugin/public/types';
import { validate } from './rule_form/validate';

export const getDescriptionFields: GetDescriptionFieldsFn<DegradedDocsRuleParams> = ({
  rule,
  prebuildFields,
}) => {
  if (!rule || !prebuildFields) return [];

  return [prebuildFields.indexPattern([rule.params.searchConfiguration.index])];
};

export function getRuleType(): RuleTypeModel<DegradedDocsRuleParams> {
  return {
    id: DEGRADED_DOCS_RULE_TYPE_ID,
    description: i18n.translate('xpack.datasetQuality.alert.degradedDocs.descriptionText', {
      defaultMessage: 'Alert when degraded docs percentage exceeds a threshold.',
    }),
    iconClass: 'bell',
    documentationUrl: null,
    ruleParamsExpression: lazy(() => import('./rule_form')),
    validate,
    requiresAppContext: false,
    getDescriptionFields,
  };
}
