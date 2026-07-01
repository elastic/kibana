/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type TypeOf, schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import {
  APM_INDEX_PATTERN_MAX_LENGTH,
  type ApmIndexSettingKey,
  type ApmIndexValidationIssue,
  validateApmIndexSetting,
} from './apm_indices_validation';

export { APM_INDEX_PATTERN_MAX_LENGTH } from './apm_indices_validation';

export const createApmIndexStringSchema = (
  setting: ApmIndexSettingKey,
  options: { defaultValue?: string } = {}
) =>
  schema.string({
    ...options,
    maxLength: APM_INDEX_PATTERN_MAX_LENGTH,
    validate: (value) => {
      const validationIssue = validateApmIndexSetting(setting, value);

      return validationIssue ? formatApmIndexValidationIssue(validationIssue) : undefined;
    },
  });

function formatApmIndexValidationIssue(validationIssue: ApmIndexValidationIssue) {
  switch (validationIssue.code) {
    case 'maxLength':
      return i18n.translate('xpack.apmSourcesAccess.apmIndices.validation.maxLength', {
        defaultMessage: 'Must be {maxLength} characters or fewer',
        values: { maxLength: validationIssue.maxLength },
      });
  }
}

/**
 * Schema for APM indices
 */
export const indicesSchema = schema.object({
  transaction: createApmIndexStringSchema('transaction', {
    defaultValue: 'traces-apm*,apm-*,traces-*.otel-*',
  }), // TODO: remove apm-* pattern in 9.0
  span: createApmIndexStringSchema('span', {
    defaultValue: 'traces-apm*,apm-*,traces-*.otel-*',
  }),
  error: createApmIndexStringSchema('error', {
    defaultValue: 'logs-apm*,apm-*,logs-*.otel-*',
  }),
  metric: createApmIndexStringSchema('metric', {
    defaultValue: 'metrics-apm*,apm-*,metrics-*.otel-*',
  }),
  onboarding: createApmIndexStringSchema('onboarding', { defaultValue: 'apm-*' }), // Unused: to be deleted
  sourcemap: createApmIndexStringSchema('sourcemap', { defaultValue: 'apm-*' }), // Unused: to be deleted
});

/**
 * Schema for APM Sources configuration
 */
export const configSchema = schema.object({
  indices: indicesSchema,
});

/**
 * Schema for APM Sources configuration
 */
export type APMSourcesAccessConfig = TypeOf<typeof configSchema>;
/**
 * Schema for APM indices
 */
export type APMIndices = APMSourcesAccessConfig['indices'];
