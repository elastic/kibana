/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FindAnonymizationFieldsResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/find_anonymization_fields_route.gen';
import { isAllowed, isAnonymized, isDenied } from '@kbn/elastic-assistant-common';
import { ContextEditorRow } from '../types';

export const getRows = ({
  anonymizationFields,
  rawData,
}: {
  anonymizationFields: FindAnonymizationFieldsResponse;
  rawData: Record<string, string[]> | null;
}): ContextEditorRow[] => {
  if (rawData !== null && typeof rawData === 'object') {
    const rawFields = Object.keys(rawData).sort();

    return rawFields.reduce<ContextEditorRow[]>(
      (acc, field) => [
        ...acc,
        {
          field,
          allowed: isAllowed({ anonymizationFields: anonymizationFields.data, field }),
          anonymized: isAnonymized({ anonymizationFields: anonymizationFields.data, field }),
          denied: isDenied({ anonymizationFields: anonymizationFields.data, field }),
          rawValues: rawData[field],
        },
      ],
      []
    );
  } else {
    return anonymizationFields.data.map<ContextEditorRow>((anonymizationField) => ({
      field: anonymizationField.field,
      allowed: anonymizationField.allowed ?? false,
      anonymized: anonymizationField.anonymized ?? false,
      denied: !!anonymizationField.allowed,
      rawValues: [],
    }));
  }
};
