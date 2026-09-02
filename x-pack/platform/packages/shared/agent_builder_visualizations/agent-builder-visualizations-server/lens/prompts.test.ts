/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlEsqlColumnInfo } from '@elastic/elasticsearch/lib/api/types';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { createGenerateConfigPrompt } from './prompts';

const systemText = (columns?: EsqlEsqlColumnInfo[]): string => {
  const [system] = createGenerateConfigPrompt({
    nlQuery: 'count logs by status',
    esqlQuery: 'FROM logs-* | STATS count = COUNT(*) BY status',
    columns,
    chartType: SupportedChartType.Metric,
    schema: {},
  });
  return String((system as [string, string])[1]);
};

describe('createGenerateConfigPrompt', () => {
  it('lists executed ES|QL columns as the only bindable names', () => {
    const text = systemText([
      { name: 'count', type: 'long' },
      { name: 'status', type: 'keyword' },
    ]);

    expect(text).toContain('<columns>');
    expect(text).toContain('- "count" (long)');
    expect(text).toContain('- "status" (keyword)');
    expect(text).toContain('bind only the executed result columns');
    expect(text).not.toContain('No column information is available');
  });

  it('lists an empty columns block when execute returned no columns', () => {
    const text = systemText([]);
    expect(text).toContain('<columns>');
    expect(text).not.toContain('No column information is available');
  });

  it('falls back to query-text inference when columns were never executed', () => {
    const text = systemText();
    expect(text).toContain(
      'No column information is available; infer fields from the ES|QL query: FROM logs-* | STATS count = COUNT(*) BY status'
    );
    expect(text).not.toContain('<columns>');
  });
});
