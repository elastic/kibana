/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ruleTemplateDataSchema, type RuleTemplateResponse } from '@kbn/alerting-v2-schemas';
import type { KueryNode } from '@kbn/es-query';
import { nodeBuilder } from '@kbn/es-query';
import { RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../../../common/saved_object_types';
import type { FindRuleTemplatesSortField } from './types';

const ATTRIBUTES_PREFIX = `${RULE_TEMPLATE_SAVED_OBJECT_TYPE}.attributes`;

/** Attribute path of the tags stored on an alerting v2 rule template. */
export const RULE_TEMPLATE_TAGS_FIELD = `${ATTRIBUTES_PREFIX}.rule.metadata.tags`;

/**
 * Fields searched via the saved objects client's `search` / `searchFields`
 * params (simple_query_string). Only `text`-mapped fields can be listed here —
 * a trailing `*` creates phrase-prefix queries, which Elasticsearch rejects on
 * keyword fields. Paths are attribute-relative, as `searchFields` expects.
 */
export const RULE_TEMPLATE_SEARCH_FIELDS = ['rule.metadata.name', 'rule.metadata.description'];

/**
 * Restricts every query to templates authored for the v2 engine. The
 * `alerting_rule_template` saved object type is shared with alerting v1, whose
 * documents carry a different attribute shape.
 */
export const buildEngineV2Filter = (): KueryNode =>
  nodeBuilder.is(`${ATTRIBUTES_PREFIX}.engine`, 'v2');

/**
 * Narrows results to templates carrying at least one of `tags`, AND-ed with the
 * engine filter. Returns the engine filter unchanged when no tags are supplied.
 */
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

/**
 * Maps the public sort field onto the indexed saved object attribute path.
 * Sorting defaults to name so paging is stable when the caller does not ask
 * for an order.
 */
export const mapSortField = (sortField?: FindRuleTemplatesSortField): string => {
  const sortFieldMap: Record<FindRuleTemplatesSortField, string> = {
    name: 'rule.metadata.name.keyword',
    tags: 'rule.metadata.tags',
  };

  return sortFieldMap[sortField ?? 'name'];
};

/**
 * Parses stored attributes into the API response shape.
 *
 * Templates are installed by Fleet packages rather than written through this
 * API, so the stored payload is untrusted input here. Parsing also applies the
 * create-rule schema defaults, which keeps the response directly submittable to
 * the create rule API. Throws when the attributes are not valid v2 template data.
 */
export const transformRuleTemplateSoAttributesToApiResponse = (
  id: string,
  attributes: unknown
): RuleTemplateResponse => ({
  id,
  ...ruleTemplateDataSchema.parse(attributes),
});
