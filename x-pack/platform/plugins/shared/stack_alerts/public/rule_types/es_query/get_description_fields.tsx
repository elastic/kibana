/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { GetDescriptionFieldsFn } from '@kbn/triggers-actions-ui-plugin/public/types';
import { RULE_PREBUILD_DESCRIPTION_FIELDS } from '@kbn/triggers-actions-ui-plugin/public';
import type { EsQueryRuleParams } from '@kbn/response-ops-rule-params/es_query/latest';
import type { SearchConfigurationType } from '@kbn/response-ops-rule-params/common';

export const getDescriptionFields: GetDescriptionFieldsFn<
  Omit<EsQueryRuleParams, 'searchConfiguration'> & { searchConfiguration: SearchConfigurationType }
> = ({ rule, prebuildFields }) => {
  if (!rule || !prebuildFields) return [];

  if (rule.params.searchType === 'esQuery') {
    return [
      prebuildFields[RULE_PREBUILD_DESCRIPTION_FIELDS.INDEX_PATTERN](rule.params.index),
      prebuildFields[RULE_PREBUILD_DESCRIPTION_FIELDS.CUSTOM_QUERY](rule.params.esQuery),
    ];
  }

  if (rule.params.searchType === 'esqlQuery') {
    return [
      prebuildFields[RULE_PREBUILD_DESCRIPTION_FIELDS.ESQL_QUERY](rule.params.esqlQuery.esql),
    ];
  }

  if (rule.params.searchType === 'searchSource' && rule.params.searchConfiguration) {
    const searchConfiguration = rule.params.searchConfiguration;
    const queryField = [];

    if (searchConfiguration.query.query != null) {
      if (typeof searchConfiguration.query.query === 'string') {
        queryField.push(
          prebuildFields[RULE_PREBUILD_DESCRIPTION_FIELDS.CUSTOM_QUERY](
            searchConfiguration.query.query
          )
        );
      }
    }

    return [
      ...(searchConfiguration.index
        ? [
            prebuildFields[RULE_PREBUILD_DESCRIPTION_FIELDS.DATA_VIEW_INDEX_PATTERN](
              searchConfiguration.index
            ),
          ]
        : []),
      ...queryField,
    ];
  }

  return [];
};
