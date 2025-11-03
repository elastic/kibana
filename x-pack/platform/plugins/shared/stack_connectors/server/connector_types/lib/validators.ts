/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod';

export const FIELDS_MAX_LENGTH_ERROR = (length: number, fieldName: string) =>
  i18n.translate('xpack.stackConnectors.schema.otherFieldsLengthError', {
    values: { length, fieldName },
    defaultMessage:
      'A maximum of {length, plural, =1 {{length} field} other {{length} fields}} in {fieldName} can be defined at a time.',
  });

export const FIELDS_KEY_NOT_ALLOWED_ERROR = (properties: string, fieldName: string) =>
  i18n.translate('xpack.stackConnectors.schema.otherFieldsPropertyError', {
    values: { properties, fieldName },
    defaultMessage: 'The following properties cannot be defined inside {fieldName}: {properties}.',
  });

export const validateRecordMaxKeys = ({
  record,
  ctx,
  maxNumberOfFields,
  fieldName,
}: {
  record: Record<string, unknown>;
  ctx: z.RefinementCtx;
  maxNumberOfFields: number;
  fieldName: string;
}) => {
  if (Object.keys(record).length > maxNumberOfFields) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: FIELDS_MAX_LENGTH_ERROR(maxNumberOfFields, fieldName),
    });
  }
};

export const validateKeysAllowed = ({
  key,
  ctx,
  disallowList,
  fieldName,
}: {
  key: string;
  ctx: z.RefinementCtx;
  disallowList: string[];
  fieldName: string;
}) => {
  const propertiesSet = new Set(disallowList);

  if (propertiesSet.has(key)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: FIELDS_KEY_NOT_ALLOWED_ERROR(key, fieldName),
    });
  }
};
