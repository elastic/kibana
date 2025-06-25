/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COMPARATORS } from '@kbn/alerting-comparators';
import { i18n } from '@kbn/i18n';
import { DegradedDocsRuleParams } from '@kbn/response-ops-rule-params/degraded_docs';
import { ValidationResult } from '@kbn/triggers-actions-ui-plugin/public/types';

const invalidThresholdValue = (value?: number) =>
  !value || (value && (isNaN(value) || value < 0 || value > 100));

export function validate(ruleParams: DegradedDocsRuleParams): ValidationResult {
  const errors: { [key: string]: string[] } = {};

  if (!ruleParams.searchConfiguration) {
    return {
      errors: {
        searchConfiguration: [
          i18n.translate(
            'xpack.datasetQuality.alerts.validation.error.requiredSearchConfiguration',
            {
              defaultMessage: 'Search source configuration is required.',
            }
          ),
        ],
      },
    };
  }

  if (!ruleParams.searchConfiguration.index) {
    return {
      errors: {
        searchConfiguration: [
          i18n.translate('xpack.datasetQuality.alerts.validation.error.requiredDataViewText', {
            defaultMessage: 'Data view is required.',
          }),
        ],
      },
    };
  }

  if (!ruleParams.threshold || invalidThresholdValue(ruleParams.threshold?.[0])) {
    errors.threshold0 = [
      i18n.translate('xpack.datasetQuality.alerts.validation.threshold', {
        defaultMessage: 'A valid percentage threshold is required (0-100).',
      }),
    ];
  }

  if (
    (ruleParams.comparator === COMPARATORS.BETWEEN ||
      ruleParams.comparator === COMPARATORS.NOT_BETWEEN) &&
    invalidThresholdValue(ruleParams.threshold?.[1])
  ) {
    errors.threshold1 = [
      i18n.translate('xpack.datasetQuality.alerts.validation.threshold', {
        defaultMessage: 'A valid percentage threshold is required (0-100).',
      }),
    ];
  }

  return { errors };
}
