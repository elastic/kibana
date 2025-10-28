/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Replacements } from '../../schemas';
import type { AnonymizationFieldResponse } from '../../schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';
import { getAnonymizedData } from '../get_anonymized_data';
import { getAnonymizedValues } from '../get_anonymized_values';
import { getCsvFromData } from '../get_csv_from_data';

interface TransformRawDataParams {
  anonymizationFields?: AnonymizationFieldResponse[];
  currentReplacements: Replacements | undefined;
  getAnonymizedValue: ({
    currentReplacements,
    rawValue,
  }: {
    currentReplacements: Replacements | undefined;
    rawValue: string;
  }) => string;
  onNewReplacements?: (replacements: Replacements) => void;
  rawData: string | Record<string, unknown[]>;
}

export const transformRawData = ({
  anonymizationFields,
  currentReplacements,
  getAnonymizedValue,
  onNewReplacements,
  rawData,
}: TransformRawDataParams): string => {
  if (typeof rawData === 'string') {
    return rawData;
  }

  const anonymizedData = transformRawDataToRecord({
    anonymizationFields,
    currentReplacements,
    getAnonymizedValue,
    onNewReplacements,
    rawData,
  });

  return getCsvFromData(anonymizedData);
};

export const transformRawDataToRecord = ({
  anonymizationFields,
  currentReplacements,
  getAnonymizedValue,
  onNewReplacements,
  rawData,
}: Omit<TransformRawDataParams, 'rawData'> & { rawData: Record<string, unknown[]> }): Record<
  string,
  string[]
> => {
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

  return anonymizedData.anonymizedData;
};
