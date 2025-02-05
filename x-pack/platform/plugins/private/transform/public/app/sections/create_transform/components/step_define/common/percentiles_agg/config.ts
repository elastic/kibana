/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { PercentilesAggForm } from './percentiles_form_component';
import type {
  IPivotAggsConfigPercentiles,
  PercentilesAggConfig,
  ValidationResult,
  ValidationResultErrorType,
} from './types';
import type { PivotAggsConfigBase } from '../../../../../../common';
import {
  isPivotAggsConfigWithUiBase,
  PERCENTILES_AGG_DEFAULT_PERCENTS,
} from '../../../../../../common';
import type { PivotAggsConfigWithUiBase } from '../../../../../../common/pivot_aggs';
import { MAX_PERCENTILE_PRECISION, MAX_PERCENTILE_VALUE, MIN_PERCENTILE_VALUE } from './constants';

function validatePercentsInput(config: Partial<PercentilesAggConfig>): ValidationResult {
  const allValues = [...(config.percents ?? [])];
  const errors: ValidationResultErrorType[] = [];
  // Combine existing percents with pending input for validation
  if (config.pendingPercentileInput) {
    // Replace comma with dot before converting to number
    const normalizedInput = config.pendingPercentileInput.replace(',', '.');
    const pendingValue = Number(normalizedInput);

    if (allValues.includes(pendingValue)) {
      errors.push('DUPLICATE_VALUE');
    }

    if (normalizedInput.replace('.', '').length > MAX_PERCENTILE_PRECISION) {
      errors.push('NUMBER_TOO_PRECISE');
    }

    allValues.push(pendingValue);
  }

  if (allValues.length === 0) {
    return {
      isValid: false,
      errors: [],
    };
  }

  if (allValues.some((value) => isNaN(value))) {
    errors.push('INVALID_FORMAT');
  }
  if (allValues.some((value) => value < MIN_PERCENTILE_VALUE || value > MAX_PERCENTILE_VALUE)) {
    errors.push('PERCENTILE_OUT_OF_RANGE');
  }

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

export function getPercentilesAggConfig(
  commonConfig: PivotAggsConfigWithUiBase | PivotAggsConfigBase
): IPivotAggsConfigPercentiles {
  const field = isPivotAggsConfigWithUiBase(commonConfig) ? commonConfig.field : null;

  return {
    ...commonConfig,
    isSubAggsSupported: false,
    isMultiField: false,
    AggFormComponent: PercentilesAggForm,
    field,
    aggConfig: {
      percents: PERCENTILES_AGG_DEFAULT_PERCENTS,
    },
    setUiConfigFromEs(esAggDefinition) {
      const { field: esField, percents } = esAggDefinition;

      this.field = esField;
      this.aggConfig.percents = percents;
    },
    getEsAggConfig() {
      if (!this.isValid()) {
        return null;
      }

      return {
        field: this.field as string,
        percents: this.aggConfig.percents ?? [],
      };
    },
    isValid() {
      const validationResult = validatePercentsInput(this.aggConfig);
      this.aggConfig.errors = validationResult.errors;
      return validationResult.isValid;
    },
    getErrorMessages() {
      if (!this.aggConfig.errors?.length) return;

      return this.aggConfig.errors.map((error) => ERROR_MESSAGES[error]);
    },
  };
}

const ERROR_MESSAGES: Record<ValidationResultErrorType, string> = {
  INVALID_FORMAT: i18n.translate('xpack.transform.agg.popoverForm.invalidFormatError', {
    defaultMessage: 'Percentile must be a valid number',
  }),
  PERCENTILE_OUT_OF_RANGE: i18n.translate(
    'xpack.transform.agg.popoverForm.percentileOutOfRangeError',
    {
      defaultMessage: 'Percentiles must be between 0 and 100',
    }
  ),
  NUMBER_TOO_PRECISE: i18n.translate('xpack.transform.agg.popoverForm.numberTooPreciseError', {
    defaultMessage: 'Value is too precise. Use fewer decimal places.',
  }),
  DUPLICATE_VALUE: i18n.translate('xpack.transform.agg.popoverForm.duplicateValueError', {
    defaultMessage: 'Value already exists',
  }),
};
