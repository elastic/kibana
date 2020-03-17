/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, isEmpty } from 'lodash/fp';
import { Filter, esKuery, KueryNode } from '../../../../../../../../../src/plugins/data/public';
import {
  DataProvider,
  DataProvidersAnd,
} from '../../../../components/timeline/data_providers/data_provider';
import { Ecs } from '../../../../graphql/types';

interface FindValueToChangeInQuery {
  field: string;
  valueToChange: string;
}

const templateFields = [
  'host.name',
  'host.hostname',
  'host.domain',
  'host.id',
  'host.ip',
  'client.ip',
  'destination.ip',
  'server.ip',
  'source.ip',
  'network.community_id',
  'user.name',
  'process.name',
];

/* The mistake here was that ECS is returning array of string and we should have
 *  check for that and not just passing array in the dsl query
 *
 */
const hasValueInStringArray = (value: unknown) => Array.isArray(value) && value.length > 0;

export const findValueToChangeInQuery = (
  keuryNode: KueryNode,
  valueToChange: FindValueToChangeInQuery[] = []
): FindValueToChangeInQuery[] => {
  let localValueToChange = valueToChange;
  if (keuryNode.function === 'is' && templateFields.includes(keuryNode.arguments[0].value)) {
    localValueToChange = [
      ...localValueToChange,
      {
        field: keuryNode.arguments[0].value,
        valueToChange: keuryNode.arguments[1].value,
      },
    ];
  }
  return keuryNode.arguments.reduce(
    (addValueToChange: FindValueToChangeInQuery[], ast: KueryNode) => {
      if (ast.function === 'is' && templateFields.includes(ast.arguments[0].value)) {
        return [
          ...addValueToChange,
          {
            field: ast.arguments[0].value,
            valueToChange: ast.arguments[1].value,
          },
        ];
      }
      if (ast.arguments) {
        return findValueToChangeInQuery(ast, addValueToChange);
      }
      return addValueToChange;
    },
    localValueToChange
  );
};

export const replaceTemplateFieldFromQuery = (query: string, ecsData: Ecs) => {
  if (query.trim() !== '') {
    const valueToChange = findValueToChangeInQuery(esKuery.fromKueryExpression(query));
    return valueToChange.reduce((newQuery, vtc) => {
      const newValue = get(vtc.field, ecsData);
      if (hasValueInStringArray(newValue)) {
        return newQuery.replace(vtc.valueToChange, newValue[0]);
      } else if (newValue != null) {
        return newQuery.replace(vtc.valueToChange, newValue);
      }
      return newQuery;
    }, query);
  }
  return '';
};

export const replaceTemplateFieldFromMatchFilters = (filters: Filter[], ecsData: Ecs) =>
  filters.map(filter => {
    if (
      filter.meta.type === 'phrase' &&
      filter.meta.key != null &&
      templateFields.includes(filter.meta.key)
    ) {
      const newValue = get(filter.meta.key, ecsData);
      if (newValue != null) {
        filter.meta.params = { query: newValue };
        if (hasValueInStringArray(newValue)) {
          filter.query = { match_phrase: { [filter.meta.key]: newValue[0] } };
        } else if (newValue != null) {
          filter.query = { match_phrase: { [filter.meta.key]: newValue } };
        }
      }
    }
    return filter;
  });

export const reformatDataProviderWithNewValue = <T extends DataProvider | DataProvidersAnd>(
  dataProvider: T,
  ecsData: Ecs
): T => {
  if (templateFields.includes(dataProvider.queryMatch.field)) {
    const newValue = get(dataProvider.queryMatch.field, ecsData);
    dataProvider.id = dataProvider.id.replace(dataProvider.name, newValue);
    dataProvider.queryMatch.displayField = undefined;
    dataProvider.queryMatch.displayValue = undefined;
    if (hasValueInStringArray(newValue)) {
      dataProvider.name = newValue[0];
      dataProvider.queryMatch.value = newValue[0];
    } else if (newValue != null) {
      dataProvider.name = newValue;
      dataProvider.queryMatch.value = newValue;
    }
  }
  return dataProvider;
};

export const replaceTemplateFieldFromDataProviders = (
  dataProviders: DataProvider[],
  ecsData: Ecs
) =>
  dataProviders.map((dataProvider: DataProvider) => {
    const newDataProvider = reformatDataProviderWithNewValue(dataProvider, ecsData);
    if (newDataProvider.and != null && !isEmpty(newDataProvider.and)) {
      newDataProvider.and = newDataProvider.and.map(andDataProvider =>
        reformatDataProviderWithNewValue(andDataProvider, ecsData)
      );
    }
    return newDataProvider;
  });
