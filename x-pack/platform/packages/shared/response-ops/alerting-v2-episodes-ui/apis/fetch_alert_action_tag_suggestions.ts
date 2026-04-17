/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { buildAlertActionTagSuggestionsQuery } from '../queries/alert_action_tag_suggestions_query';
import { executeEsqlQuery } from '../utils/execute_esql_query';

export interface FetchAlertActionTagSuggestionsOptions {
  services: { expressions: ExpressionsStart };
  abortSignal?: AbortSignal;
}

export interface AlertActionTagSuggestionRow {
  tags: string;
}

/**
 * Returns up to 20 distinct tag values taken from each episode's latest TAG action
 * (see {@link buildAlertActionTagSuggestionsQuery}).
 */
export const fetchAlertActionTagSuggestions = async ({
  services: { expressions },
  abortSignal,
}: FetchAlertActionTagSuggestionsOptions): Promise<AlertActionTagSuggestionRow[]> => {
  return executeEsqlQuery<AlertActionTagSuggestionRow>({
    expressions,
    query: buildAlertActionTagSuggestionsQuery(),
    input: null,
    abortSignal,
    noCache: true,
  });
};
