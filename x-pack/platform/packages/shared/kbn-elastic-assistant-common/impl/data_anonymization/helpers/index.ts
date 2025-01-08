/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Replacements } from '../../schemas';
import { AnonymizationFieldResponse } from '../../schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';

export const getIsDataAnonymizable = (rawData: string | Record<string, string[]>): boolean =>
  typeof rawData !== 'string';

export const isAllowed = ({
  anonymizationFields,
  field,
}: {
  anonymizationFields: AnonymizationFieldResponse[];
  field: string;
}): boolean => anonymizationFields.find((a) => a.field === field)?.allowed ?? false;

export const isDenied = ({
  anonymizationFields,
  field,
}: {
  anonymizationFields: AnonymizationFieldResponse[];
  field: string;
}): boolean => !(anonymizationFields.find((a) => a.field === field)?.allowed ?? false);

export const isAnonymized = ({
  anonymizationFields,
  field,
}: {
  anonymizationFields: AnonymizationFieldResponse[];
  field: string;
}): boolean => anonymizationFields.find((a) => a.field === field)?.anonymized ?? false;

export const replaceAnonymizedValuesWithOriginalValues = ({
  messageContent,
  replacements,
}: {
  messageContent: string;
  replacements: Replacements | null | undefined;
}): string =>
  replacements != null
    ? Object.keys(replacements).reduce((acc, key) => {
        const value = replacements[key];

        return acc.replaceAll(key, value);
      }, messageContent)
    : messageContent;

export const replaceOriginalValuesWithUuidValues = ({
  messageContent,
  replacements,
}: {
  messageContent: string;
  replacements: Replacements;
}): string =>
  replacements != null
    ? Object.keys(replacements).reduce((acc, key) => {
        const value = replacements[key];
        return value ? acc.replaceAll(value, key) : acc;
      }, messageContent)
    : messageContent;
