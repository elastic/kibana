/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FindAnonymizationFieldsResponse } from '../schemas/anonymization_fields/find_anonymization_fields_route.gen';

export interface AnonymizedValues {
  /** The original values were transformed to these anonymized values */
  anonymizedValues: string[];

  /** A map from replacement value to original value */
  replacements: Record<string, string>;
}

export interface AnonymizedData {
  /** The original data was transformed to this anonymized data */
  anonymizedData: Record<string, string[]>;

  /** A map from replacement value to original value */
  replacements: Record<string, string>;
}

export type GetAnonymizedValues = ({
  anonymizationFields,
  currentReplacements,
  field,
  getAnonymizedValue,
  rawData,
}: {
  anonymizationFields?: FindAnonymizationFieldsResponse;
  currentReplacements: Record<string, string> | undefined;
  field: string;
  getAnonymizedValue: ({
    currentReplacements,
    rawValue,
  }: {
    currentReplacements: Record<string, string> | undefined;
    rawValue: string;
  }) => string;
  rawData: Record<string, unknown[]>;
}) => AnonymizedValues;
