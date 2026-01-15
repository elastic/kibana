/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { GetDescriptionFieldsFn } from '@kbn/triggers-actions-ui-plugin/public/types';
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
    return [prebuildFields.indexPattern(params.index), prebuildFields.customQuery(params.esQuery)];
  }

  if (rule.params.searchType === 'esqlQuery') {
    const params = rule.params as OnlyEsqlQueryRuleParams;
    return [prebuildFields.esqlQuery(params.esqlQuery.esql)];
  }

  if (rule.params.searchType === 'searchSource' && rule.params.searchConfiguration) {
    const params = rule.params as OnlySearchSourceRuleParams;
    const searchConfig = params.searchConfiguration;
    const fields = [];

    if (searchConfig?.index && typeof searchConfig.index === 'string') {
      fields.push(prebuildFields.dataViewIndexPattern(searchConfig.index));
    }

    if (
      searchConfig?.query &&
      isOfQueryType(searchConfig.query) &&
      typeof searchConfig.query.query === 'string'
    ) {
      fields.push(prebuildFields.customQuery(searchConfig.query.query));
    }

    if (
      searchConfig?.filter &&
      Array.isArray(searchConfig.filter) &&
      searchConfig.filter.length &&
      typeof searchConfig.index === 'string'
    ) {
      fields.push(
        prebuildFields.queryFilters({
          filters: searchConfig.filter,
          dataViewId: searchConfig.index,
        })
      );
    }

    return [...fields];
  }

  return [];
};
