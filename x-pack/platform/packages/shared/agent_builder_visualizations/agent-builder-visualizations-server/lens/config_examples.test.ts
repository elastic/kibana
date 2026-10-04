/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlEsqlColumnInfo } from '@elastic/elasticsearch/lib/api/types';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { chartTypeRegistry } from './chart_type_registry';
import { selectConfigExamples } from './config_examples';
import { getEsqlDataSourceCarriers } from './graph_lens';

const withDataSource = (config: object): object => {
  const configWithDataSource = structuredClone(config);
  getEsqlDataSourceCarriers(configWithDataSource).forEach((carrier) => {
    carrier.data_source = { type: 'esql', query: 'FROM logs-* | STATS count = COUNT()' };
  });
  return configWithDataSource;
};

const dateColumn: EsqlEsqlColumnInfo = { name: 'bucket', type: 'date' };
const categoryColumn: EsqlEsqlColumnInfo = { name: 'host.name', type: 'keyword' };
const measureColumn: EsqlEsqlColumnInfo = { name: 'Requests', type: 'long' };

describe('Lens config examples', () => {
  describe.each(Object.values(SupportedChartType))('%s', (chartType) => {
    const examples = selectConfigExamples(chartType);

    it('has at least one example', () => {
      expect(examples.length).toBeGreaterThan(0);
    });

    it.each(examples)('"$label" is valid once the system injects the data source', ({ config }) => {
      expect(() => chartTypeRegistry[chartType].schema.parse(withDataSource(config))).not.toThrow();
    });

    it.each(examples)(
      '"$label" leaves out the data source and defaulted layer settings',
      ({ config }) => {
        const json = JSON.stringify(config);
        expect(json).not.toContain('data_source');
        expect(json).not.toContain('sampling');
        expect(json).not.toContain('ignore_global_filters');
      }
    );
  });

  it.each<[string, EsqlEsqlColumnInfo[], string[]]>([
    [
      'a date and a measure',
      [dateColumn, measureColumn],
      ['Time series: ', 'Time series with legend statistics', 'Specific series color'],
    ],
    [
      'a date, a category, and a measure',
      [dateColumn, categoryColumn, measureColumn],
      ['Time series split by a category', 'Specific colors per category'],
    ],
    [
      'a category and a measure',
      [categoryColumn, measureColumn],
      ['Ranking by category', 'Specific series color'],
    ],
  ])('picks the xy examples that fit %s', (_, columns, labels) => {
    const examples = selectConfigExamples(SupportedChartType.XY, columns);

    expect(examples.map(({ label }) => label)).toEqual(
      labels.map((label) => expect.stringContaining(label))
    );
  });

  it('offers every xy example when the result columns are unknown', () => {
    expect(selectConfigExamples(SupportedChartType.XY)).toHaveLength(6);
  });

  it('keeps examples that fit any result columns', () => {
    expect(selectConfigExamples(SupportedChartType.Metric, [measureColumn])).toEqual(
      selectConfigExamples(SupportedChartType.Metric)
    );
  });
});
