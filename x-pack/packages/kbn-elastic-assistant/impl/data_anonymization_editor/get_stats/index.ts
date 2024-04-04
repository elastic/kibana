/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAllowed, isAnonymized, isDenied } from '@kbn/elastic-assistant-common';

import type { SelectedPromptContext } from '../../assistant/prompt_context/types';
import { Stats } from '../helpers';

export const getStats = ({ contextAnonymizationFields, rawData }: SelectedPromptContext): Stats => {
  const ZERO_STATS = {
    allowed: 0,
    anonymized: 0,
    denied: 0,
    total: 0,
  };

  if (typeof rawData === 'string') {
    return ZERO_STATS;
  } else {
    const rawFields = Object.keys(rawData);

    return rawFields.reduce<Stats>(
      (acc, field) => ({
        allowed:
          acc.allowed +
          (isAllowed({ anonymizationFields: contextAnonymizationFields?.data ?? [], field })
            ? 1
            : 0),
        anonymized:
          acc.anonymized +
          (isAllowed({ anonymizationFields: contextAnonymizationFields?.data ?? [], field }) &&
          isAnonymized({ anonymizationFields: contextAnonymizationFields?.data ?? [], field })
            ? 1
            : 0),
        denied:
          acc.denied +
          (isDenied({ anonymizationFields: contextAnonymizationFields?.data ?? [], field })
            ? 1
            : 0),
        total: acc.total + 1,
      }),
      ZERO_STATS
    );
  }
};
