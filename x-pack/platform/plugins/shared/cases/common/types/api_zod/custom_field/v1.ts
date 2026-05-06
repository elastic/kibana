/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH } from '../../../constants';
import { limitedStringSchema, limitedNumberAsIntegerSchema } from '../../../schema_zod';

export const CaseCustomFieldTextWithValidationValueSchema = (fieldName: string) =>
  limitedStringSchema({ fieldName, min: 1, max: MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH });

export const CaseCustomFieldNumberWithValidationValueSchema = ({
  fieldName,
}: {
  fieldName: string;
}) => limitedNumberAsIntegerSchema({ fieldName });

export const CustomFieldPutRequestSchema = z.object({
  value: z.union([
    z.boolean(),
    z.null(),
    CaseCustomFieldTextWithValidationValueSchema('value'),
    CaseCustomFieldNumberWithValidationValueSchema({ fieldName: 'value' }),
  ]),
  caseVersion: z.string(),
});

export type CustomFieldPutRequest = z.infer<typeof CustomFieldPutRequestSchema>;
