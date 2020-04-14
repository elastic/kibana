/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash';

import { Query } from '../../../../../../../../src/plugins/data/server';
import { List, ListOperator, ListValues } from '../routes/schemas/types/lists_default_array';
import { RuleAlertParams } from '../types';

export const getLanguageBooleanOperator = (language: string, value: string) => {
  if (language === 'lucene') {
    return value.toUpperCase();
  }

  return value;
};

export const operatorBuilder = (operator: ListOperator, language: string): string => {
  return operator === 'excluded'
    ? ` ${getLanguageBooleanOperator(language, 'and')} `
    : ` ${getLanguageBooleanOperator(language, 'and')} ${getLanguageBooleanOperator(
        language,
        'not'
      )} `;
};

export const buildExists = ({
  operator,
  field,
  language,
}: {
  operator: ListOperator;
  field: string;
  language: string;
}): string => {
  switch (language) {
    case 'kuery':
      return `${operatorBuilder(operator, language)}${field}:*`;
    case 'lucene':
      return `${operatorBuilder(operator, language)}_exists_${field}`;
    default:
      return '';
  }
};

export const buildMatch = ({
  operator,
  field,
  values,
  language,
}: {
  operator: ListOperator;
  field: string;
  values: ListValues[];
  language: string;
}) => {
  const value = values[0].name;
  return `${operatorBuilder(operator, language)}${field}:${value}`;
};

export const buildMatchAll = ({
  operator,
  field,
  values,
  language,
}: {
  operator: ListOperator;
  field: string;
  values: ListValues[];
  language: string;
}) => {
  if (values.length === 1) {
    return buildMatch({ operator, field, values, language });
  } else {
    const matchAllValues = values.map(value => {
      return value.name;
    });

    return `${operatorBuilder(operator, language)}${field}:(${matchAllValues.join(
      ` ${getLanguageBooleanOperator(language, 'or')} `
    )})`;
  }
};

export const evaluateValues = ({ list, language }: { list: List; language: string }): string => {
  const { values_operator: operator, values_type: type, field, values } = list;
  switch (type) {
    case 'exists':
      return buildExists({ operator, field, language });
    case 'match':
      return buildMatch({ operator, field, values: values!, language });
    case 'match_all':
      return buildMatchAll({ operator, field, values: values!, language });
    default:
      return '';
  }
};

export const buildExceptions = ({
  query,
  lists,
  language,
  includeQuery = true,
}: {
  query: string;
  lists: List[];
  language: string;
  includeQuery: boolean;
}): string[] => {
  return lists.reduce<string[]>((acc, item) => {
    let exception: string[] = [];
    const { and, ...exceptionDetails } = { ...item };

    exception = [...exception, evaluateValues({ list: exceptionDetails, language })];

    if (and) {
      const andExceptions = buildExceptions({ query, lists: and, language, includeQuery: false });

      exception = [...exception, ...andExceptions];
    }

    if (includeQuery) {
      return [...acc, `(${query}${exception.join('')})`];
    } else {
      return [...acc, exception.join('')];
    }
  }, []);
};

export const buildQueryExceptions = ({
  query,
  language,
  lists,
}: {
  query: string;
  language: string;
  lists?: RuleAlertParams['lists'];
}): Query[] => {
  if (lists && lists !== null) {
    const exceptions = buildExceptions({ lists, language, query, includeQuery: true });
    const builtQuery =
      exceptions.length > 0
        ? exceptions.join(` ${getLanguageBooleanOperator(language, 'or')} `)
        : query;

    return [
      {
        query: builtQuery,
        language,
      },
    ];
  } else {
    return [{ query, language }];
  }
};
