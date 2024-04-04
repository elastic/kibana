/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FindAnonymizationFieldsResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/find_anonymization_fields_route.gen';
import { ContextEditorRow } from '../types';

export const getRows = ({
  anonymizationFields,
  rawData,
}: {
  anonymizationFields: FindAnonymizationFieldsResponse;
  rawData: Record<string, string[]> | null;
}): ContextEditorRow[] => {
  if (rawData !== null && typeof rawData === 'object') {
    const rawFields = Object.keys(rawData);

    return anonymizationFields.data
      .filter((f) => rawFields.includes(f.field))
      .sort((a, b) => (a.field > b.field ? 1 : -1))
      .map<ContextEditorRow>((anonymizationField) => ({
        field: anonymizationField.field,
        allowed: anonymizationField.allowed ?? false,
        anonymized: anonymizationField.anonymized ?? false,
        denied: !!anonymizationField.allowed,
        rawValues: rawData[anonymizationField.field],
      }));
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
