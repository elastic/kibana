/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDatasetEsqlQuery } from './get_dataset_esql_query';

describe('getDatasetEsqlQuery', () => {
  it.each(['test_dataset', 'test-dataset', '.internal-dataset', 'dataset@2024+prod'])(
    'leaves %s unquoted',
    (datasetName) => {
      expect(getDatasetEsqlQuery(datasetName)).toBe(`FROM ${datasetName}`);
    }
  );

  it.each([
    ['test=1', 'FROM "test=1"'],
    ['dataset[1]', 'FROM "dataset[1]"'],
    ['cluster:dataset', 'FROM "cluster:dataset"'],
    ['a,b', 'FROM "a,b"'],
    ['dataset|logs', 'FROM "dataset|logs"'],
  ])('quotes %s as %s', (datasetName, expected) => {
    expect(getDatasetEsqlQuery(datasetName)).toBe(expected);
  });

  it('escapes quotes and backslashes inside a quoted name', () => {
    expect(getDatasetEsqlQuery('say "hi" \\ bye')).toBe('FROM "say \\"hi\\" \\\\ bye"');
  });
});
