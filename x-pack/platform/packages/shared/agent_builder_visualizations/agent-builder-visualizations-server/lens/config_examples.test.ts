/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { chartTypeRegistry } from './chart_type_registry';
import { getConfigExamples } from './config_examples';
import { getEsqlDataSourceCarriers } from './graph_lens';

const withDataSource = (config: object): object => {
  const configWithDataSource = structuredClone(config);
  getEsqlDataSourceCarriers(configWithDataSource).forEach((carrier) => {
    carrier.data_source = { type: 'esql', query: 'FROM logs-* | STATS count = COUNT()' };
  });
  return configWithDataSource;
};

describe('Lens config examples', () => {
  describe.each(Object.values(SupportedChartType))('%s', (chartType) => {
    const examples = getConfigExamples(chartType);

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
});
