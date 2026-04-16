/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useService } from '@kbn/core-di-browser';
import { RulesApi } from '../services/rules_api';
import { ruleKeys } from './query_key_factory';

const TAGS_STALE_TIME = 30_000;

export const useFetchRuleTags = () => {
  const rulesApi = useService(RulesApi);

  return useQuery({
    queryKey: ruleKeys.tags(),
    queryFn: async () => {
      const { tags } = await rulesApi.listTags();
      return tags;
    },
    staleTime: TAGS_STALE_TIME,
    retry: false,
    refetchOnWindowFocus: false,
  });
};
