/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useService } from '@kbn/core-di-browser';
import { useQuery } from '@kbn/react-query';
import { RuleTemplatesApi } from '../services/rule_templates_api';
import { ruleTemplateKeys } from './query_key_factory';

/**
 * Loads distinct tags from available rule templates for filter options.
 * There is no dedicated tags aggregation endpoint for templates yet, so this
 * derives unique tags from a bounded find request (same role as
 * {@link useFetchTags} for action policies).
 */
export const useFetchRuleTemplateTags = () => {
  const ruleTemplatesApi = useService(RuleTemplatesApi);

  return useQuery<string[], Error>({
    queryKey: ruleTemplateKeys.tags(),
    queryFn: async () => {
      const response = await ruleTemplatesApi.findRuleTemplates({ page: 1, perPage: 100 });
      return Array.from(
        new Set(response.items.flatMap((template) => template.metadata.tags ?? []))
      ).sort();
    },
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000,
  });
};
