/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FindRuleTemplatesResponse,
  FindRuleTemplatesSortField,
} from '@kbn/alerting-v2-schemas';
import { useService } from '@kbn/core-di-browser';
import { useQuery } from '@kbn/react-query';
import { RuleTemplatesApi } from '../services/rule_templates_api';
import { ruleTemplateKeys } from './query_key_factory';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;
const TEMPLATES_STALE_TIME_MS = 30_000;

export interface UseFetchRuleTemplatesParams {
  page?: number;
  perPage?: number;
  search?: string;
  tags?: string[];
  sortField?: FindRuleTemplatesSortField;
  sortOrder?: 'asc' | 'desc';
  enabled?: boolean;
}

/** Fetches installed v2 rule templates via React Query without side-effect toasts. */
export const useFetchRuleTemplates = ({
  page = DEFAULT_PAGE,
  perPage = DEFAULT_PER_PAGE,
  search,
  tags,
  sortField,
  sortOrder,
  enabled = true,
}: UseFetchRuleTemplatesParams = {}) => {
  const ruleTemplatesApi = useService(RuleTemplatesApi);

  return useQuery<FindRuleTemplatesResponse, Error>({
    queryKey: ruleTemplateKeys.list({ page, perPage, search, tags, sortField, sortOrder }),
    queryFn: () =>
      ruleTemplatesApi.listRuleTemplates({
        page,
        per_page: perPage,
        search,
        tags,
        sort_field: sortField,
        sort_order: sortOrder,
      }),
    enabled,
    staleTime: TEMPLATES_STALE_TIME_MS,
    retry: false,
    refetchOnWindowFocus: false,
  });
};
