/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import { RuleTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import { DatasetQualityRuleParams } from './types';

export function getRuleType(): RuleTypeModel<DatasetQualityRuleParams> {
  return {
    id: 'datasetQuality',
    description: i18n.translate('xpack.datasetQuality.alert.descriptionText', {
      defaultMessage: 'Alert when dataset quality indicator exceeds a threshold.',
    }),
    iconClass: 'bell',
    documentationUrl: null,
    ruleParamsExpression: lazy(() => import('./rule_form')),
    validate: () => ({ errors: {} }),
    requiresAppContext: false,
  };
}
