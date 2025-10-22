/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { GetDescriptionFieldsFn } from '@kbn/triggers-actions-ui-plugin/public/types';
import { RULE_DETAIL_DESCRIPTION_FIELD_TYPES } from '@kbn/triggers-actions-ui-plugin/common';

export const getDescriptionFields: GetDescriptionFieldsFn = ({ rule, prebuildFields }) => {
  if (!rule || !prebuildFields) return [];

  if (rule.params.searchType === 'esQuery') {
    return [
      prebuildFields[RULE_DETAIL_DESCRIPTION_FIELD_TYPES.INDEX_PATTERN](
        rule.params.index as string[]
      ),
      prebuildFields[RULE_DETAIL_DESCRIPTION_FIELD_TYPES.CUSTOM_QUERY](
        rule.params.esQuery as string
      ),
    ];
  }

  if (rule.params.searchType === 'esqlQuery') {
    return [
      prebuildFields[RULE_DETAIL_DESCRIPTION_FIELD_TYPES.ESQL_QUERY](
        (rule.params.esqlQuery as { esql: string }).esql
      ),
    ];
  }

  if (rule.params.searchType === 'searchSource' && rule.params.searchConfiguration) {
    return [
      prebuildFields[RULE_DETAIL_DESCRIPTION_FIELD_TYPES.DATA_VIEW_INDEX_PATTERN](
        (rule.params.searchConfiguration as { index: string }).index
      ),
      prebuildFields[RULE_DETAIL_DESCRIPTION_FIELD_TYPES.CUSTOM_QUERY](
        (rule.params.searchConfiguration as { query: { query: string } }).query.query
      ),
    ];
  }

  return [];
};
