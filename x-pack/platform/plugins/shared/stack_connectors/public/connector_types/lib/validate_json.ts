/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPlainObject } from 'lodash';
import { i18n } from '@kbn/i18n';

interface ValidateJSONArgs {
  value?: string | null | Record<string, unknown>;
  maxProperties?: number;
}

const isObject = (value?: ValidateJSONArgs['value']): value is Record<string, unknown> => {
  return isPlainObject(value);
};

export const MAX_ATTRIBUTES_ERROR = (length: number) =>
  i18n.translate('xpack.stackConnectors.schema.additionalFieldsLengthError', {
    values: { length },
    defaultMessage: 'A maximum of {length} additional fields can be defined at a time.',
  });

export const INVALID_JSON_FORMAT = i18n.translate(
  'xpack.stackConnectors.components.otherFieldsFormatErrorMessage',
  {
    defaultMessage: 'Invalid JSON.',
  }
);

export const validateJSON = ({ value, maxProperties }: ValidateJSONArgs) => {
  try {
    if (isObject(value)) {
      return;
    }

    if (value) {
      const parsedOtherFields = JSON.parse(value);

      if (maxProperties && Object.keys(parsedOtherFields).length > maxProperties) {
        return MAX_ATTRIBUTES_ERROR(maxProperties);
      }
    }
  } catch (error) {
    return INVALID_JSON_FORMAT;
  }
};
