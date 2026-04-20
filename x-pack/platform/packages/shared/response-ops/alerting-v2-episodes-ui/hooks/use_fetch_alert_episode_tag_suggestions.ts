/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import {
  type AlertActionTagSuggestionRow,
  fetchAlertActionTagSuggestions,
} from '../apis/fetch_alert_action_tag_suggestions';
import { queryKeys } from '../query_keys';

export interface UseFetchAlertEpisodeTagSuggestionsOptions {
  services: { expressions: ExpressionsStart };
  enabled?: boolean;
}

export const useFetchAlertEpisodeTagSuggestions = ({
  services,
  enabled = true,
}: UseFetchAlertEpisodeTagSuggestionsOptions) =>
  useQuery({
    queryKey: queryKeys.alertActionTagSuggestions(),
    queryFn: ({ signal }) => fetchAlertActionTagSuggestions({ services, abortSignal: signal }),
    enabled,
    refetchOnWindowFocus: false,
    select: (rows: AlertActionTagSuggestionRow[]) => {
      const tags: string[] = [];

      for (const row of rows) {
        const value = row.tags;

        if (typeof value === 'string' && value.length > 0) {
          tags.push(value);
        }
      }
      return tags;
    },
  });
