/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Replacements } from '../../schemas';
import { AnonymizationFieldResponse } from '../../schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';
import { getAnonymizedData } from '../get_anonymized_data';
import { getAnonymizedValues } from '../get_anonymized_values';
import { getCsvFromData } from '../get_csv_from_data';

export const transformRawData = ({
  anonymizationFields,
  currentReplacements,
  getAnonymizedValue,
  onNewReplacements,
  rawData,
}: {
  anonymizationFields?: AnonymizationFieldResponse[];
  currentReplacements: Replacements | undefined;
  getAnonymizedValue: ({
    currentReplacements,
    rawValue,
  }: {
    currentReplacements: Record<string, string> | undefined;
    rawValue: string;
  }) => string;
  onNewReplacements?: (replacements: Replacements) => void;
  rawData: string | Record<string, unknown[]>;
}): string => {
  if (typeof rawData === 'string') {
    return rawData;
  }

  const anonymizedData = getAnonymizedData({
    anonymizationFields,
    currentReplacements,
    rawData,
    getAnonymizedValue,
    getAnonymizedValues,
  });

  if (onNewReplacements != null) {
    onNewReplacements(anonymizedData.replacements);
  }

  return getCsvFromData(anonymizedData.anonymizedData);
};
