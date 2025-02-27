/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ESQLVariableType } from '@kbn/esql-validation-autocomplete';
import { getEmbeddableVariables } from './utils';

describe('getEmbeddableVariables', () => {
  test('should return undefined if query is not of type AggregateQuery', () => {
    const query = {
      language: 'kuery',
      query: 'test',
    };
    const esqlVariables = [
      {
        key: 'field',
        value: 'test',
        type: ESQLVariableType.FIELDS,
      },
      {
        key: 'interval',
        value: '1 hour',
        type: ESQLVariableType.TIME_LITERAL,
      },
      {
        key: 'value',
        value: 'meow',
        type: ESQLVariableType.VALUES,
      },
    ];
    expect(getEmbeddableVariables(query, esqlVariables)).toBeUndefined();
  });

  test('should return esqlVariables if query has no variables', () => {
    const query = {
      esql: 'FROM index',
    };
    const esqlVariables = [
      {
        key: 'field',
        value: 'test',
        type: ESQLVariableType.FIELDS,
      },
      {
        key: 'interval',
        value: '1 hour',
        type: ESQLVariableType.TIME_LITERAL,
      },
      {
        key: 'value',
        value: 'meow',
        type: ESQLVariableType.VALUES,
      },
    ];
    expect(getEmbeddableVariables(query, esqlVariables)).toEqual(esqlVariables);
  });

  test('should return only the associated variables with the query', () => {
    const query = {
      esql: 'FROM index | STATS COUNT(*) BY ?field',
    };
    const esqlVariables = [
      {
        key: 'field',
        value: 'test',
        type: ESQLVariableType.FIELDS,
      },
      {
        key: 'interval',
        value: '1 hour',
        type: ESQLVariableType.TIME_LITERAL,
      },
      {
        key: 'value',
        value: 'meow',
        type: ESQLVariableType.VALUES,
      },
    ];
    expect(getEmbeddableVariables(query, esqlVariables)).toEqual([
      {
        key: 'field',
        value: 'test',
        type: ESQLVariableType.FIELDS,
      },
    ]);
  });
});
