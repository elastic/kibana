/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { createAuthorVegaSpecPrompt, vegaEsqlAdditionalInstructions } from './prompts';

const systemText = (nlQuery: string): string => {
  const [system] = createAuthorVegaSpecPrompt({ nlQuery, esqlQuery: 'FROM logs-*' });
  return String((system as [string, string])[1]);
};

describe('createAuthorVegaSpecPrompt', () => {
  it('binds the provided ES|QL query into the prompt', () => {
    const [system] = createAuthorVegaSpecPrompt({
      nlQuery: 'a bar chart of counts by status',
      esqlQuery: 'FROM logs-* | STATS count = COUNT(*) BY status',
    });
    const text = String((system as [string, string])[1]);

    expect(text).toContain('FROM logs-* | STATS count = COUNT(*) BY status');
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
});
