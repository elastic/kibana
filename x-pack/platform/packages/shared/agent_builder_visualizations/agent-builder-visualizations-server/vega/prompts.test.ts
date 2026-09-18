/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlEsqlColumnInfo } from '@elastic/elasticsearch/lib/api/types';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { createAuthorVegaSpecPrompt, vegaEsqlAdditionalInstructions } from './prompts';

const ESQL_QUERY = 'FROM logs-* | STATS count = COUNT(*) BY status';
const ESQL_QUERY_JSON = JSON.stringify(ESQL_QUERY);

const systemText = (nlQuery: string): string => {
  const [system] = createAuthorVegaSpecPrompt({ nlQuery, esqlQuery: 'FROM logs-*' });
  return String((system as [string, string])[1]);
};

const promptSystemText = (columns?: EsqlEsqlColumnInfo[]): string => {
  const [system] = createAuthorVegaSpecPrompt({
    nlQuery: 'a bar chart of counts by status',
    esqlQuery: ESQL_QUERY,
    columns,
  });
  return String((system as [string, string])[1]);
};

const dataSourceRulesSection = (text: string): string => {
  const start = text.indexOf('DATA SOURCE RULES:');
  const end = text.indexOf('\nENCODING TYPES:');
  if (start === -1 || end === -1) {
    throw new Error('DATA SOURCE RULES section not found');
  }
  return text.slice(start, end).trimEnd();
};

const expectedDataSourceRules = (rule3: string): string =>
  `DATA SOURCE RULES:
1. Bind the data with Kibana's inline ES|QL source: a top-level "data": { "url": { "%type%": "esql", "query": ${ESQL_QUERY_JSON} } }. Use the query verbatim — do not modify it; the system re-binds and validates it.
2. If the query uses the time-picker params (?_tstart / ?_tend), add "%timefield%": "@timestamp" to the url so Kibana binds the time range.
3. ${rule3}`;

describe('createAuthorVegaSpecPrompt', () => {
  it('lists executed ES|QL columns as the only bindable names', () => {
    expect(
      dataSourceRulesSection(
        promptSystemText([
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
    expect(dataSourceRulesSection(promptSystemText([]))).toBe(
      expectedDataSourceRules(
        `No column information is available; infer fields from the ES|QL query: ${ESQL_QUERY}`
      )
    );
  });

  it('falls back to query-text inference when columns were never executed', () => {
    expect(dataSourceRulesSection(promptSystemText())).toBe(
      expectedDataSourceRules(
        `No column information is available; infer fields from the ES|QL query: ${ESQL_QUERY}`
      )
    );
  });

  it('instructs Vega-Lite only (never raw Vega)', () => {
    const text = systemText('any chart');
    expect(text).toContain('Vega-Lite ONLY');
    expect(text).toContain('never raw Vega');
  });

  it('always includes the dotted-field escaping guidance', () => {
    expect(systemText('any chart')).toContain('DOTS IN FIELD NAMES');
  });

  it('guides faceting: columns as a sibling and explicit per-cell sizing', () => {
    const text = systemText('small multiples of bytes by client ip');
    expect(text).toContain('FACETING / SMALL MULTIPLES');
    expect(text).toContain('"columns"');
    expect(text).toContain('SIBLING of "facet"/"spec"');
    expect(text).toContain('NOT inside the "facet" object');
    expect(text).toContain('set explicit "width" and "height" INSIDE the inner "spec"');
  });

  it('defers colors to the Kibana theme instead of hardcoding them', () => {
    const text = systemText('any chart');
    expect(text).toContain('Do NOT hardcode colors');
    expect(text).toContain('theme-aware Elastic palette');
    // Categorical color should not set a scheme/range (that would override the theme).
    expect(text).toContain('do NOT set a "scheme", "range"');
  });

  it('includes axis-readability guidance (labelLimit, time-axis, title:null)', () => {
    const text = systemText('any chart');
    expect(text).toContain('"labelLimit": 150');
    expect(text).toContain('"labelAngle": 0');
    expect(text).toContain('"tickCount": 8');
    expect(text).toContain('"title": null');
  });

  it('injects the caller-provided reference-examples block verbatim', () => {
    const [system] = createAuthorVegaSpecPrompt({
      nlQuery: 'scatter of latency vs throughput',
      esqlQuery: 'FROM logs-*',
      referenceExamples: '\nREFERENCE EXAMPLES:\n### Scatter / bubble plot (encoded size)\n',
    });
    const text = String((system as [string, string])[1]);

    expect(text).toContain('REFERENCE EXAMPLES');
    expect(text).toContain('Scatter / bubble plot (encoded size)');
  });

  it('omits the reference-examples section when none is provided', () => {
    expect(systemText('a bar chart of counts by status')).not.toContain('REFERENCE EXAMPLES');
  });

  it('includes the chart-type hint only when one is provided', () => {
    expect(systemText('any chart')).not.toContain('Suggested chart style');

    const [system] = createAuthorVegaSpecPrompt({
      nlQuery: 'any chart',
      esqlQuery: 'FROM logs-*',
      chartType: SupportedChartType.XY,
    });
    expect(String((system as [string, string])[1])).toContain('Suggested chart style: "xy"');
  });
});

describe('vegaEsqlAdditionalInstructions', () => {
  it('requires an explicit WHERE time-range filter on the raw source field', () => {
    expect(vegaEsqlAdditionalInstructions).toContain(
      'WHERE <time field> >= ?_tstart AND <time field> < ?_tend'
    );
    expect(vegaEsqlAdditionalInstructions).toContain('RAW source time field');
    expect(vegaEsqlAdditionalInstructions).toContain(
      'Never filter or bucket on a field produced by'
    );
  });

  it('asks to RENAME dotted columns to dotless aliases, except the time field', () => {
    expect(vegaEsqlAdditionalInstructions).toContain('Field names for Vega');
    expect(vegaEsqlAdditionalInstructions).toContain('RENAME host.name AS host');
    expect(vegaEsqlAdditionalInstructions).toContain('Do NOT rename the time field');
  });
});
