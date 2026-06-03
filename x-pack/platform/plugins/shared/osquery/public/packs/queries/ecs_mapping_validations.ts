/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * Validates that an ECS key is provided when a result value exists.
 * Extracted from ECSComboboxFieldComponent's `ecsFieldValidator`.
 *
 * @param ecsKey - The ECS field key value
 * @param resultValue - The sibling result.value field
 * @returns error message if invalid, undefined if valid
 */
export const validateEcsField = (
  ecsKey: string | undefined,
  resultValue: string | string[] | undefined
): string | undefined => {
  if (!ecsKey?.length && resultValue?.length) {
    return i18n.translate('xpack.osquery.pack.queryFlyoutForm.ecsFieldRequiredErrorMessage', {
      defaultMessage: 'ECS field is required.',
    });
  }
};

/**
 * Validates that a result value is provided when an ECS key exists.
 * Extracted from OsqueryColumnFieldComponent's `osqueryResultFieldValidator`.
 *
 * @param resultValue - The osquery result field value
 * @param ecsKey - The sibling ECS key field
 * @returns error message if invalid, undefined if valid
 */
export const validateOsqueryResultField = (
  resultValue: string | string[] | undefined,
  ecsKey: string | undefined
): string | undefined => {
  if (!resultValue?.length && ecsKey?.length) {
    return i18n.translate(
      'xpack.osquery.pack.queryFlyoutForm.osqueryResultFieldRequiredErrorMessage',
      {
        defaultMessage: 'Value field is required.',
      }
    );
  }
};
