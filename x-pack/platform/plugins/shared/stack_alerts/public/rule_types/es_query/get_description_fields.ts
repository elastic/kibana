/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { GetDescriptionFieldsFn } from '@kbn/triggers-actions-ui-plugin/public/types';
import { RULE_PREBUILD_DESCRIPTION_FIELDS } from '@kbn/triggers-actions-ui-plugin/public';
import { isOfQueryType } from '@kbn/es-query';
import type {
  EsQueryRuleParams,
  OnlyEsQueryRuleParams,
  OnlyEsqlQueryRuleParams,
  OnlySearchSourceRuleParams,
} from './types';

export const getDescriptionFields: GetDescriptionFieldsFn<EsQueryRuleParams> = ({
  rule,
  prebuildFields,
}) => {
  if (!rule || !prebuildFields) return [];

  if (rule.params.searchType === 'esQuery') {
    const params = rule.params as OnlyEsQueryRuleParams;
    return [
      prebuildFields[RULE_PREBUILD_DESCRIPTION_FIELDS.INDEX_PATTERN](params.index),
      prebuildFields[RULE_PREBUILD_DESCRIPTION_FIELDS.CUSTOM_QUERY](params.esQuery),
    ];
  }

  if (rule.params.searchType === 'esqlQuery') {
    const params = rule.params as OnlyEsqlQueryRuleParams;
    return [prebuildFields[RULE_PREBUILD_DESCRIPTION_FIELDS.ESQL_QUERY](params.esqlQuery.esql)];
  }

  if (rule.params.searchType === 'searchSource' && rule.params.searchConfiguration) {
    const params = rule.params as OnlySearchSourceRuleParams;
    const searchConfig = params.searchConfiguration;
    const queryField = [];

    if (
      searchConfig?.query &&
      isOfQueryType(searchConfig.query) &&
      typeof searchConfig.query.query === 'string'
    ) {
      queryField.push(
        prebuildFields[RULE_PREBUILD_DESCRIPTION_FIELDS.CUSTOM_QUERY](searchConfig.query.query)
      );
    }

    return [
      ...(searchConfig?.index && typeof searchConfig.index === 'string'
        ? [
            prebuildFields[RULE_PREBUILD_DESCRIPTION_FIELDS.DATA_VIEW_INDEX_PATTERN](
              searchConfig.index
            ),
          ]
        : []),
      ...queryField,
    ];
  }

  return [];
};
