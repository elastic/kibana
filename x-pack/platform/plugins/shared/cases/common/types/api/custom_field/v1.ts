/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH } from '../../../constants';
import { limitedStringSchema, limitedNumberAsIntegerSchema } from '../../../schema';

export const CaseCustomFieldTextWithValidationValueRt = (fieldName: string) =>
  limitedStringSchema({
    fieldName,
    min: 1,
    max: MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH,
  });

export const CaseCustomFieldNumberWithValidationValueRt = ({ fieldName }: { fieldName: string }) =>
  limitedNumberAsIntegerSchema({
    fieldName,
  });

/**
 * Update custom_field
 */

export const CustomFieldPutRequestRt = rt.strict({
  value: rt.union([
    rt.boolean,
    rt.null,
    CaseCustomFieldTextWithValidationValueRt('value'),
    CaseCustomFieldNumberWithValidationValueRt({ fieldName: 'value' }),
  ]),
  caseVersion: rt.string,
});

export type CustomFieldPutRequest = rt.TypeOf<typeof CustomFieldPutRequestRt>;
