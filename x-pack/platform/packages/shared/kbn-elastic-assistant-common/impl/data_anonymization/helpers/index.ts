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
}): string => {
  if (replacements == null || Object.keys(replacements).length === 0) {
    return messageContent;
  }

  // De-dupe replacements just in case, and sort by length descending to avoid partial matches
  const values = Array.from(new Set(Object.values(replacements))).sort(
    (a, b) => b.length - a.length
  );

  // Swap uuid->value for quick lookup, first in wins if duplicates exist
  const valueToUuid = Object.entries(replacements).reduce<Record<string, string>>(
    (acc, [uuid, value]) => {
      if (value && acc[value] === undefined) {
        acc[value] = uuid;
      }
      return acc;
    },
    {}
  );

  // Escape regex special characters
  const pattern = values.map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return messageContent.replace(new RegExp(pattern, 'g'), (match) => valueToUuid[match] ?? match);
};
