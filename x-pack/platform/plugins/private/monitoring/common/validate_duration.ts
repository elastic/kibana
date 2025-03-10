/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { RuleTypeParams, ValidationResult } from '@kbn/triggers-actions-ui-plugin/public';

export interface ValidateDurationOptions extends RuleTypeParams {
  duration: string;
}

export const validateDuration = (inputValues: ValidateDurationOptions): ValidationResult => {
  const validationResult = { errors: {} };
  const errors: { [key: string]: string[] } = {
    duration: [],
  };
  if (!inputValues.duration) {
    errors.duration.push(
      i18n.translate('xpack.monitoring.alerts.validation.duration', {
        defaultMessage: 'A valid duration is required.',
      })
    );
  }
  validationResult.errors = errors;
  return validationResult;
};
