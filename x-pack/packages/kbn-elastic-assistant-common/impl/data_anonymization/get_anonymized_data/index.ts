/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Replacements } from '../../schemas';
import { AnonymizationFieldResponse } from '../../schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';
import { isAllowed } from '../helpers';
import type { AnonymizedData, GetAnonymizedValues } from '../types';

export const getAnonymizedData = ({
  anonymizationFields,
  currentReplacements,
  getAnonymizedValue,
  getAnonymizedValues,
  rawData,
}: {
  anonymizationFields?: AnonymizationFieldResponse[];
  currentReplacements: Replacements | undefined;
  getAnonymizedValue: ({
    currentReplacements,
    rawValue,
  }: {
    currentReplacements: Replacements | undefined;
    rawValue: string;
  }) => string;
  getAnonymizedValues: GetAnonymizedValues;
  rawData: Record<string, unknown[]>;
}): AnonymizedData =>
  Object.keys(rawData).reduce<AnonymizedData>(
    (acc, field) => {
      if (isAllowed({ anonymizationFields: anonymizationFields ?? [], field })) {
        const { anonymizedValues, replacements } = getAnonymizedValues({
          anonymizationFields,
          currentReplacements,
          field,
          getAnonymizedValue,
          rawData,
        });

        return {
          anonymizedData: {
            ...acc.anonymizedData,
            [field]: anonymizedValues,
          },
          replacements: {
            ...acc.replacements,
            ...replacements,
          },
        };
      } else {
        return acc;
      }
    },
    {
      anonymizedData: {},
      replacements: {},
    }
  );
