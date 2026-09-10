/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { useQuery } from '@kbn/react-query';
import { ALERTING_V2_RULE_API_PATH } from '@kbn/alerting-v2-constants';
import type { RuleTagsResponse } from '@kbn/alerting-v2-schemas';
import { ruleFormKeys } from './query_key_factory';

const TAGS_STALE_TIME = 30 * 1000;

export const useFetchRuleTags = ({ http, search }: { http: HttpStart; search?: string }) => {
  const normalizedSearch = search?.trim() || undefined;

  return useQuery<string[], Error>({
    queryKey: ruleFormKeys.tags(normalizedSearch),
    queryFn: async () => {
      const { tags } = await http.get<RuleTagsResponse>(`${ALERTING_V2_RULE_API_PATH}/tags`, {
        query: {
          search: normalizedSearch,
        },
      });
      return tags;
    },
    refetchOnWindowFocus: false,
    staleTime: TAGS_STALE_TIME,
  });
};
