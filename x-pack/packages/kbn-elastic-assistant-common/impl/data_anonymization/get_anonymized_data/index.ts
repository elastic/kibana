/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FindAnonymizationFieldsResponse } from '../../schemas/anonymization_fields/find_anonymization_fields_route.gen';
import { isAllowed } from '../helpers';
import type { AnonymizedData, GetAnonymizedValues } from '../types';

export const getAnonymizedData = ({
  anonymizationFields,
  currentReplacements,
  getAnonymizedValue,
  getAnonymizedValues,
  rawData,
}: {
  anonymizationFields?: FindAnonymizationFieldsResponse;
  currentReplacements: Record<string, string> | undefined;
  getAnonymizedValue: ({
    currentReplacements,
    rawValue,
  }: {
    currentReplacements: Record<string, string> | undefined;
    rawValue: string;
  }) => string;
  getAnonymizedValues: GetAnonymizedValues;
  rawData: Record<string, unknown[]>;
}): AnonymizedData =>
  Object.keys(rawData).reduce<AnonymizedData>(
    (acc, field) => {
      if (isAllowed({ anonymizationFields: anonymizationFields?.data ?? [], field })) {
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
