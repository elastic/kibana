/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlEsqlColumnInfo } from '@elastic/elasticsearch/lib/api/types';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { createGenerateConfigPrompt } from './prompts';

const ESQL_QUERY = 'FROM logs-* | STATS count = COUNT(*) BY status';

const systemText = (columns?: EsqlEsqlColumnInfo[]): string => {
  const [system] = createGenerateConfigPrompt({
    nlQuery: 'count logs by status',
    esqlQuery: ESQL_QUERY,
    columns,
    chartType: SupportedChartType.Metric,
    schema: {},
  });
  return String((system as [string, string])[1]);
};

const dataSourceRulesSection = (text: string): string => {
  const start = text.indexOf('DATA SOURCE RULES:');
  const end = text.indexOf('\nTITLE RULES:');
  if (start === -1 || end === -1) {
    throw new Error('DATA SOURCE RULES section not found');
  }
  return text.slice(start, end).trimEnd();
};

const expectedDataSourceRules = (rule4: string): string =>
  `DATA SOURCE RULES:
1. The ES|QL query is owned and injected by the system automatically. DO NOT output a 'data_source' field, and do not restate, copy, or modify the query anywhere in the config.
2. Follow the schema definition strictly, with the single exception that you must omit the 'data_source' field.
3. For ES|QL column bindings use { column: '<esql column name>', ...other options }.
4. ${rule4}`;

describe('createGenerateConfigPrompt', () => {
  it('lists executed ES|QL columns as the only bindable names', () => {
    expect(
      dataSourceRulesSection(
        systemText([
          { name: 'count', type: 'long' },
          { name: 'status', type: 'keyword' },
        ])
      )
    ).toBe(
      expectedDataSourceRules(`Bind only these executed result columns, using their exact names:
<columns>
- "count" (long)
- "status" (keyword)
</columns>`)
    );
  });

  it('falls back to query-text inference when execute returned no columns', () => {
    expect(dataSourceRulesSection(systemText([]))).toBe(
      expectedDataSourceRules(
        `No column information is available; infer fields from the ES|QL query: ${ESQL_QUERY}`
      )
    );
  });

  it('falls back to query-text inference when columns were never executed', () => {
    expect(dataSourceRulesSection(systemText())).toBe(
      expectedDataSourceRules(
        `No column information is available; infer fields from the ES|QL query: ${ESQL_QUERY}`
      )
    );
  });
});
