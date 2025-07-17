/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAllowed, isAnonymized, isDenied, Replacements } from '@kbn/elastic-assistant-common';

import { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas';
import { Stats } from '../helpers';

export const getStats = ({
  anonymizationFieldsStatus,
  anonymizationFields = [],
  rawData,
  replacements,
}: {
  anonymizationFieldsStatus?: {
    allowed?: { doc_count: number };
    anonymized?: { doc_count: number };
    denied?: { doc_count: number };
  };
  anonymizationFields?: AnonymizationFieldResponse[];
  rawData?: string | Record<string, string[]>;
  replacements?: Replacements;
}): Stats => {
  const ZERO_STATS = {
    allowed: 0,
    anonymized: 0,
    denied: 0,
    total: 0,
  };

  if (!anonymizationFieldsStatus && !rawData) {
    return ZERO_STATS;
  }

  if (!rawData && anonymizationFieldsStatus) {
    return {
      allowed: anonymizationFieldsStatus.allowed?.doc_count ?? 0,
      anonymized: anonymizationFieldsStatus.anonymized?.doc_count ?? 0,
      denied: anonymizationFieldsStatus.denied?.doc_count ?? 0,
      total: anonymizationFields.length,
    };
  } else if (typeof rawData === 'string') {
    if (replacements == null) {
      return ZERO_STATS;
    } else {
      return {
        ...ZERO_STATS,
        anonymized: Object.keys(replacements).length,
      };
    }
  } else {
    const rawFields = Object.keys(rawData ?? {});

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
