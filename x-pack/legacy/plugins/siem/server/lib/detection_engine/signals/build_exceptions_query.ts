/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Query } from '../../../../../../../../src/plugins/data/server';
import { List, ListOperator, ListValues } from '../routes/schemas/types/lists_default_array';
import { RuleAlertParams, Language } from '../types';

interface Operators {
  and: string;
  not: string;
  or: string;
}

export const getLanguageBooleanOperator = ({
  language,
  value,
}: {
  language: keyof Language;
  value: keyof Operators;
}) => {
  if (language === 'lucene') {
    return value.toUpperCase();
  } else {
    return value;
  }
};

export const operatorBuilder = ({
  operator,
  language,
}: {
  operator: ListOperator;
  language: keyof Language;
}): string => {
  return operator === 'excluded'
    ? ` ${getLanguageBooleanOperator({ language, value: 'and' })} `
    : ` ${getLanguageBooleanOperator({ language, value: 'and' })} ${getLanguageBooleanOperator({
        language,
        value: 'not',
      })} `;
};

export const buildExists = ({
  operator,
  field,
  language,
}: {
  operator: ListOperator;
  field: string;
  language: keyof Language;
}): string => {
  switch (language) {
    case 'kuery':
      return `${operatorBuilder({ operator, language })}${field}:*`;
    case 'lucene':
      return `${operatorBuilder({ operator, language })}_exists_${field}`;
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
  language: keyof Language;
}) => {
  const value = values[0].name;
  return `${operatorBuilder({ operator, language })}${field}:${value}`;
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
  language: keyof Language;
}) => {
  if (values.length === 1) {
    return buildMatch({ operator, field, values, language });
  } else {
    const matchAllValues = values.map(value => {
      return value.name;
    });

    return `${operatorBuilder({ operator, language })}${field}:(${matchAllValues.join(
      ` ${getLanguageBooleanOperator({ language, value: 'or' })} `
    )})`;
  }
};

export const evaluateValues = ({
  list,
  language,
}: {
  list: List;
  language: keyof Language;
}): string => {
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

export const formatQuery = ({
  exceptions,
  query,
  language,
}: {
  exceptions: string[];
  query: string;
  language: keyof Language;
}) => {
  if (exceptions.length > 0) {
    const formattedExceptions = exceptions.map(item => {
      return `(${query}${item})`;
    });

    return formattedExceptions.join(` ${getLanguageBooleanOperator({ language, value: 'or' })} `);
  } else {
    return query;
  }
};

export const buildExceptions = ({
  query,
  lists,
  language,
}: {
  query: string;
  lists: List[];
  language: keyof Language;
}): string[] => {
  return lists.reduce<string[]>((acc, item) => {
    const { and, ...exceptionDetails } = { ...item };
    const andExceptions = and ? buildExceptions({ query, lists: and, language }) : [];
    const exception = [evaluateValues({ list: exceptionDetails, language }), ...andExceptions];

    return [...acc, exception.join('')];
  }, []);
};

export const buildQueryExceptions = ({
  query,
  language,
  lists,
}: {
  query: string;
  language: keyof Language;
  lists: RuleAlertParams['lists'];
}): Query[] => {
  if (lists && lists !== null) {
    const exceptions = buildExceptions({ lists, language, query });
    const formattedExceptions = formatQuery({ exceptions, language, query });

    return [
      {
        query: formattedExceptions,
        language,
      },
    ];
  } else {
    return [{ query, language }];
  }
};
