/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ValidationResult } from '@kbn/triggers-actions-ui-plugin/public/types';
import { COMPARATORS } from '@kbn/alerting-comparators';

interface ValidateOptions {
  comparator: COMPARATORS;
  threshold: number[];
}

const invalidThresholdValue = (value?: number) =>
  !value || (value && (isNaN(value) || value < 0 || value > 100));

export function validate(inputValues: ValidateOptions): ValidationResult {
  const errors: { [key: string]: string[] } = {};

  if (!inputValues.threshold || invalidThresholdValue(inputValues.threshold?.[0])) {
    errors.threshold0 = i18n.translate('xpack.datasetQuality.alerts.validation.threshold', {
      defaultMessage: 'A valid percentage threshold is required (0-100).',
    });
  }

  if (
    (inputValues.comparator === COMPARATORS.BETWEEN ||
      inputValues.comparator === COMPARATORS.NOT_BETWEEN) &&
    invalidThresholdValue(inputValues.threshold?.[1])
  ) {
    errors.threshold1 = i18n.translate('xpack.datasetQuality.alerts.validation.threshold', {
      defaultMessage: 'A valid percentage threshold is required (0-100).',
    });
  }

  return { errors };
}
