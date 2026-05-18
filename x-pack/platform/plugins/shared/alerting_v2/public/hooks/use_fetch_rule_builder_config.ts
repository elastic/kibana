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

export const useFetchRuleBuilderConfig = (ruleId: string | undefined, enabled: boolean) => {
  const rulesApi = useService(RulesApi);

  return useQuery({
    queryKey: ruleKeys.ruleBuilderConfig(ruleId!),
    queryFn: () => rulesApi.getRuleBuilderConfig(ruleId!),
    enabled: Boolean(ruleId) && enabled,
    retry: false,
    refetchOnWindowFocus: false,
  });
};
