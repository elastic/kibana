/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash';

import { Query } from '../../../../../../../../src/plugins/data/server';
import {
  List,
  ListOperator,
  ListType,
  ListValues,
} from '../routes/schemas/types/lists_default_array';
import { RuleAlertParams } from '../types';

export const operatorBuilder = (operator: ListOperator): string => {
  return operator === 'excluded' ? 'not ' : '';
};

export const buildExists = (operator: ListOperator, field: string) => {
  return `${operatorBuilder(operator)}${field}: *`;
};

export const buildMatch = (operator: ListOperator, field: string, values: ListValues[]) => {
  const value = values[0].name;
  return `${operatorBuilder(operator)}${field}: ${value}`;
};

export const buildMatchAll = (operator: ListOperator, field: string, values: ListValues[]) => {
  if (values.length === 1) {
    return buildMatch(operator, field, values);
  } else {
    const matchAllValues = values.map(value => {
      return value.name;
    });

    return `${operatorBuilder(operator)}${field}: (${matchAllValues.join(' or ')})`;
  }
};

export const evaluateValues = (
  operator: ListOperator,
  type: ListType,
  field: string,
  values?: ListValues[] | undefined
) => {
  switch (type) {
    case 'exists':
      return buildExists(operator, field);
    case 'match':
      return buildMatch(operator, field, values!);
    case 'match_all':
      return buildMatchAll(operator, field, values!);
    default:
      return '';
  }
};

export const buildExceptions = (lists: List[]): string[] => {
  return lists.map(listItem => {
    const { values_operator, values_type, field, values } = listItem;
    const includeParens = lists.length > 1;
    const exception = includeParens ? ['('] : [];
    exception.push(evaluateValues(values_operator, values_type, field, values));

    if (listItem.and) {
      exception.push(' and ');
      exception.push(buildExceptions(listItem.and).join(''));
    }

    if (includeParens) exception.push(')');

    return exception.join('');
  });
};

export const buildQueryExceptions = (
  query: string,
  language: string,
  lists?: RuleAlertParams['lists']
): Query[] => {
  if (lists && lists !== null && !isEmpty(lists)) {
    const exceptions = buildExceptions(lists).join(' or ');

    return [{ query: `${query} and not (${exceptions})`, language }];
  } else {
    return [{ query, language }];
  }
};
