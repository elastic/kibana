/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultsDeep } from 'lodash';
import { i18n } from '@kbn/i18n';
import type { ValidationResult } from '@kbn/triggers-actions-ui-plugin/public';
import type { ESQLRuleParams } from './types';
import { ESQL_EXPRESSION_ERRORS } from './constants';

export const validateExpression = (ruleParams: ESQLRuleParams): ValidationResult => {
  const validationResult = { errors: {} };
  const errors: typeof ESQL_EXPRESSION_ERRORS = defaultsDeep({}, ESQL_EXPRESSION_ERRORS);
  if (!ruleParams.timeWindowSize) {
    errors.timeWindowSize.push(
      i18n.translate('xpack.stackAlerts.esql.ui.validation.error.requiredTimeWindowSizeText', {
        defaultMessage: 'Time window size is required.',
      })
    );
  }

  if (!ruleParams.esqlQuery) {
    errors.esqlQuery.push(
      i18n.translate('xpack.stackAlerts.esql.ui.validation.error.requiredQueryText', {
        defaultMessage: 'ES|QL query is required.',
      })
    );
  }
  if (!ruleParams.timeField) {
    errors.timeField.push(
      i18n.translate('xpack.stackAlerts.esql.ui.validation.error.requiredTimeFieldText', {
        defaultMessage: 'Time field is required.',
      })
    );
  }
  validationResult.errors = errors;
  return validationResult;
};

export const hasExpressionValidationErrors = (ruleParams: ESQLRuleParams) => {
  const { errors: validationErrors } = validateExpression(ruleParams);
  return Object.keys(validationErrors).some(
    (key) => validationErrors[key] && validationErrors[key].length
  );
};
