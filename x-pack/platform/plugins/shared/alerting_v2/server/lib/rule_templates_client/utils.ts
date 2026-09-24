/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ruleTemplateDataSchema,
  type FindRuleTemplatesSortField,
  type RuleTemplateResponse,
} from '@kbn/alerting-v2-schemas';
import type { KueryNode } from '@kbn/es-query';
import { nodeBuilder } from '@kbn/es-query';
import { RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../../../common/saved_object_types';

const ATTRIBUTES_PREFIX = `${RULE_TEMPLATE_SAVED_OBJECT_TYPE}.attributes`;

export const RULE_TEMPLATE_TAGS_FIELD = `${ATTRIBUTES_PREFIX}.rule.metadata.tags`;

export const RULE_TEMPLATE_SEARCH_FIELDS = ['rule.metadata.name', 'rule.metadata.description'];

export const buildEngineV2Filter = (): KueryNode =>
  nodeBuilder.is(`${ATTRIBUTES_PREFIX}.engine`, 'v2');

export const buildFindRuleTemplatesFilter = (tags?: string[]): KueryNode => {
  const engineFilter = buildEngineV2Filter();

  if (!tags?.length) {
    return engineFilter;
  }

  const tagFilters = tags.map((tag) => nodeBuilder.is(RULE_TEMPLATE_TAGS_FIELD, tag));

  return nodeBuilder.and([
    engineFilter,
    tagFilters.length === 1 ? tagFilters[0] : nodeBuilder.or(tagFilters),
  ]);
};

export const mapSortField = (sortField?: FindRuleTemplatesSortField): string => {
  const sortFieldMap: Record<FindRuleTemplatesSortField, string> = {
    name: 'rule.metadata.name.keyword',
    tags: 'rule.metadata.tags',
  };

  return sortFieldMap[sortField ?? 'name'];
};

export const transformRuleTemplateSoAttributesToApiResponse = (
  id: string,
  attributes: unknown
): RuleTemplateResponse => ({
  id,
  ...ruleTemplateDataSchema.parse(attributes),
});
