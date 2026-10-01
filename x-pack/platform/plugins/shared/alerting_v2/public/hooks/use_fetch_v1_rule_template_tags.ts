/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { TAGS_RESPONSE_LIMIT } from '@kbn/alerting-v2-constants';
import type { HttpStart } from '@kbn/core-http-browser';
import {
  findRuleTemplates,
  type RuleTemplate,
} from '@kbn/response-ops-rules-apis/apis/find_rule_templates';
import { ruleTemplateKeys } from './query_key_factory';

const TAGS_STALE_TIME = 30_000;
/** Classic find accepts at most 100 templates per page. */
const V1_TEMPLATE_TAG_PAGE_SIZE = 100;

/** Unique tags from classic templates, limited to the popover cap. */
export const collectV1RuleTemplateTags = (templates: RuleTemplate[], search?: string): string[] => {
  const needle = search?.toLowerCase();
  const tags = new Set<string>();
  for (const template of templates) {
    for (const tag of template.tags) {
      if (!needle || tag.toLowerCase().includes(needle)) {
        tags.add(tag);
      }
    }
  }
  return [...tags].sort((left, right) => left.localeCompare(right)).slice(0, TAGS_RESPONSE_LIMIT);
};

/** Loads every page of classic templates. Find accepts at most 100 per page. */
export const findAllV1RuleTemplates = async (
  http: HttpStart,
  search?: string
): Promise<RuleTemplate[]> => {
  const templates: RuleTemplate[] = [];
  let page = 1;
  let pageCount = 1;

  while (page <= pageCount) {
    const response = await findRuleTemplates({
      http,
      page,
      perPage: V1_TEMPLATE_TAG_PAGE_SIZE,
      search: search || undefined,
    });
    if (page === 1) {
      pageCount = Math.max(1, Math.ceil(response.total / V1_TEMPLATE_TAG_PAGE_SIZE));
    }
    templates.push(...response.data);
    if (response.data.length === 0) {
      break;
    }
    page += 1;
  }

  return templates;
};

/** Loads classic rule-template tags through the existing find API. */
export const useFetchV1RuleTemplateTags = ({
  search,
  enabled = true,
}: { search?: string; enabled?: boolean } = {}) => {
  const http = useService(CoreStart('http'));

  return useQuery({
    queryKey: ruleTemplateKeys.v1Tags(search),
    queryFn: async () => {
      const templates = await findAllV1RuleTemplates(http, search);
      return collectV1RuleTemplateTags(templates, search);
    },
    enabled,
    staleTime: TAGS_STALE_TIME,
    retry: false,
    refetchOnWindowFocus: false,
  });
};
