/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  convertKqlToEsqlExpression,
  EpisodeKqlTranslationError,
  type EpisodeKqlTranslationErrorReason,
  type EpisodesFilterState,
} from '@kbn/alerting-v2-common-queries';

export type EpisodeKqlValidation =
  | { isValid: true }
  | {
      isValid: false;
      error:
        | { type: 'syntax' }
        | { type: 'unsupported'; field: string; reason: EpisodeKqlTranslationErrorReason };
    };

export const validateEpisodeKql = (value: string): EpisodeKqlValidation => {
  if (!value.trim()) {
    return { isValid: true };
  }

  try {
    convertKqlToEsqlExpression(value);
    return { isValid: true };
  } catch (error) {
    if (error instanceof EpisodeKqlTranslationError) {
      return {
        isValid: false,
        error: { type: 'unsupported', field: error.field, reason: error.reason },
      };
    }
    return { isValid: false, error: { type: 'syntax' } };
  }
};

export const getQueryFilterState = (filterState: EpisodesFilterState): EpisodesFilterState => {
  if (!filterState.queryString || validateEpisodeKql(filterState.queryString).isValid) {
    return filterState;
  }

  const { queryString: _invalidQueryString, ...validFilterState } = filterState;
  return validFilterState;
};
