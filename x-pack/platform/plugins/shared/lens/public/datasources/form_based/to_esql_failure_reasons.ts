/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * Specific reasons why ES|QL conversion failed.
 * These are used to provide granular user feedback.
 */
export type EsqlConversionFailureReason =
  | 'non_utc_timezone'
  | 'formula_not_supported'
  | 'time_shift_not_supported'
  | 'runtime_field_not_supported'
  | 'reduced_time_range_not_supported'
  | 'function_not_supported'
  | 'drop_partials_not_supported'
  | 'include_empty_rows_not_supported'
  | 'terms_not_supported'
  | 'unsupported_settings'
  | 'unknown';

export const esqlConversionFailureReasonMessages: Record<EsqlConversionFailureReason, string> = {
  non_utc_timezone: i18n.translate('xpack.lens.config.cannotConvertToEsqlNonUtcTimezone', {
    defaultMessage: 'Cannot convert to ES|QL: UTC timezone is required.',
  }),
  formula_not_supported: i18n.translate('xpack.lens.config.cannotConvertToEsqlFormula', {
    defaultMessage: 'Cannot convert to ES|QL: Formula operations are not yet supported.',
  }),
  time_shift_not_supported: i18n.translate('xpack.lens.config.cannotConvertToEsqlTimeShift', {
    defaultMessage: 'Cannot convert to ES|QL: Time shift is not yet supported.',
  }),
  runtime_field_not_supported: i18n.translate('xpack.lens.config.cannotConvertToEsqlRuntimeField', {
    defaultMessage: 'Cannot convert to ES|QL: Runtime fields are not yet supported.',
  }),
  reduced_time_range_not_supported: i18n.translate(
    'xpack.lens.config.cannotConvertToEsqlReducedTimeRange',
    {
      defaultMessage: 'Cannot convert to ES|QL: Reduced time range is not yet supported.',
    }
  ),
  function_not_supported: i18n.translate('xpack.lens.config.cannotConvertToEsqlOperation', {
    defaultMessage: 'Cannot convert to ES|QL: One or more functions are not yet supported.',
  }),
  drop_partials_not_supported: i18n.translate('xpack.lens.config.cannotConvertToEsqlDropPartials', {
    defaultMessage: 'Cannot convert to ES|QL: "Drop partial buckets" option is not yet supported.',
  }),
  include_empty_rows_not_supported: i18n.translate(
    'xpack.lens.config.cannotConvertToEsqlIncludeEmptyRows',
    {
      defaultMessage: 'Cannot convert to ES|QL: "Include empty rows" option is not yet supported.',
    }
  ),
  terms_not_supported: i18n.translate('xpack.lens.config.cannotConvertToEsqlTerms', {
    defaultMessage: 'Cannot convert to ES|QL: Top values (terms) aggregation is not yet supported.',
  }),
  unsupported_settings: i18n.translate('xpack.lens.config.cannotConvertToEsqlUnsupportedSettings', {
    defaultMessage: 'Cannot convert to ES|QL: This visualization has unsupported settings.',
  }),
  unknown: i18n.translate('xpack.lens.config.cannotConvertToEsqlUnknown', {
    defaultMessage: 'This visualization cannot be converted to ES|QL.',
  }),
};

export const getFailureTooltip = (reason: EsqlConversionFailureReason | undefined): string => {
  if (!reason) {
    return esqlConversionFailureReasonMessages.unknown;
  }
  return (
    esqlConversionFailureReasonMessages[reason] ??
    esqlConversionFailureReasonMessages.unsupported_settings
  );
};
