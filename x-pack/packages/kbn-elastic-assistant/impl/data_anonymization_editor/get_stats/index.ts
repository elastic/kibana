/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAllowed, isAnonymized, isDenied } from '@kbn/elastic-assistant-common';

import { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';
import { Stats } from '../helpers';

export const getStats = ({
  anonymizationFields = [],
  rawData,
}: {
  anonymizationFields?: AnonymizationFieldResponse[];
  rawData?: string | Record<string, string[]>;
}): Stats => {
  const ZERO_STATS = {
    allowed: 0,
    anonymized: 0,
    denied: 0,
    total: 0,
  };

  if (!rawData) {
    return {
      allowed: anonymizationFields.reduce((acc, data) => (data.allowed ? acc + 1 : acc), 0),
      anonymized: anonymizationFields.reduce((acc, data) => (data.anonymized ? acc + 1 : acc), 0),
      denied: anonymizationFields.reduce(
        (acc, data) => (data.allowed === false ? acc + 1 : acc),
        0
      ),
      total: anonymizationFields.length,
    };
  } else if (typeof rawData === 'string') {
    return ZERO_STATS;
  } else {
    const rawFields = Object.keys(rawData);

    return rawFields.reduce<Stats>(
      (acc, field) => ({
        allowed: acc.allowed + (isAllowed({ anonymizationFields, field }) ? 1 : 0),
        anonymized:
          acc.anonymized +
          (isAllowed({ anonymizationFields, field }) && isAnonymized({ anonymizationFields, field })
            ? 1
            : 0),
        denied: acc.denied + (isDenied({ anonymizationFields, field }) ? 1 : 0),
        total: acc.total + 1,
      }),
      ZERO_STATS
    );
  }
};
