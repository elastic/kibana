/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useService } from '@kbn/core-di-browser';
import type { RuleTemplateTagsParams } from '@kbn/alerting-v2-schemas';
import { RuleTemplatesApi } from '../services/rule_templates_api';
import { ruleTemplateKeys } from './query_key_factory';

const TAGS_STALE_TIME = 30_000;

export const useFetchRuleTemplateTags = ({
  search,
  enabled = true,
}: RuleTemplateTagsParams & { enabled?: boolean } = {}) => {
  const ruleTemplatesApi = useService(RuleTemplatesApi);

  return useQuery({
    queryKey: ruleTemplateKeys.tags(search),
    queryFn: async () => {
      const { tags } = await ruleTemplatesApi.listTags({ search });
      return tags;
    },
    enabled,
    staleTime: TAGS_STALE_TIME,
    retry: false,
    refetchOnWindowFocus: false,
  });
};
