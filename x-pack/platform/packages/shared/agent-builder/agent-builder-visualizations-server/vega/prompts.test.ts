/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  createAuthorVegaSpecPrompt,
  radarEsqlAdditionalInstructions,
  sankeyEsqlAdditionalInstructions,
  sunburstEsqlAdditionalInstructions,
  vegaEsqlAdditionalInstructions,
} from './prompts';

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

  it('instructs Vega-Lite only (never raw Vega) by default', () => {
    const text = systemText('any chart');
    expect(text).toContain('Vega-Lite ONLY');
    expect(text).toContain('never raw Vega');
  });

  it('instructs Raw Vega when dialect is vega', () => {
    const [system] = createAuthorVegaSpecPrompt({
      nlQuery: 'sunburst of categories',
      esqlQuery: 'FROM logs-*',
      dialect: 'vega',
      catalogId: 'sunburst',
    });
    const text = String((system as [string, string])[1]);
    expect(text).toContain('Raw Vega (v5)');
    expect(text).toContain('Author Raw Vega ONLY');
    expect(text).toContain('stratify');
    expect(text).toContain('SUNBURST RULES');
    expect(text).not.toContain('Vega-Lite ONLY');
  });

  it('instructs radar rules when catalog is radar', () => {
    const [system] = createAuthorVegaSpecPrompt({
      nlQuery: 'radar of metrics',
      esqlQuery: 'FROM logs-* | STATS value = COUNT() BY key = status',
      dialect: 'vega',
      catalogId: 'radar',
    });
    const text = String((system as [string, string])[1]);
    expect(text).toContain('RADAR / SPIDER RULES');
    expect(text).toContain('linear-closed');
    expect(text).toContain('width/2');
    expect(text).toContain('height/2');
    expect(text).toContain('NEVER set top-level "encode"');
    expect(text).toContain('NEVER use autosize "none"');
    expect(text).toContain('min(width, height) / 2 - 40');
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

describe('sunburstEsqlAdditionalInstructions', () => {
  it('requires a Parent–child table for sunburst', () => {
    expect(sunburstEsqlAdditionalInstructions).toContain('Parent–child table');
    expect(sunburstEsqlAdditionalInstructions).toContain('`id`');
    expect(sunburstEsqlAdditionalInstructions).toContain('`parent`');
    expect(sunburstEsqlAdditionalInstructions).toContain('`value`');
  });

  it('requires a single synthetic root and resolvable parents (stratify integrity)', () => {
    expect(sunburstEsqlAdditionalInstructions).toContain('multiple roots');
    expect(sunburstEsqlAdditionalInstructions).toContain('id = "root"');
    expect(sunburstEsqlAdditionalInstructions).toContain('parent = "root"');
    expect(sunburstEsqlAdditionalInstructions).toContain('Leaf-only tables are INVALID');
    expect(sunburstEsqlAdditionalInstructions).toContain('TO_STRING(null)');
    expect(sunburstEsqlAdditionalInstructions).toContain('FORK');
  });
});

describe('radarEsqlAdditionalInstructions', () => {
  it('requires a key/value table for radar', () => {
    expect(radarEsqlAdditionalInstructions).toContain('`key`');
    expect(radarEsqlAdditionalInstructions).toContain('`value`');
    expect(radarEsqlAdditionalInstructions).toContain('`series`');
    expect(radarEsqlAdditionalInstructions).toContain('At least 3 distinct');
  });
});

describe('sankeyEsqlAdditionalInstructions', () => {
  it('requires a stk1/stk2/size flow table for sankey', () => {
    expect(sankeyEsqlAdditionalInstructions).toContain('`stk1`');
    expect(sankeyEsqlAdditionalInstructions).toContain('`stk2`');
    expect(sankeyEsqlAdditionalInstructions).toContain('`size`');
    expect(sankeyEsqlAdditionalInstructions).toContain('At least 2 flow');
  });
});

describe('createAuthorVegaSpecPrompt sankey', () => {
  it('instructs sankey rules when catalog is sankey', () => {
    const [system] = createAuthorVegaSpecPrompt({
      nlQuery: 'sankey of traffic',
      esqlQuery: 'FROM logs-* | STATS size = COUNT() BY stk1 = a, stk2 = b',
      dialect: 'vega',
      catalogId: 'sankey',
    });
    const text = String((system as [string, string])[1]);
    expect(text).toContain('SANKEY / FLOW RULES');
    expect(text).toContain('linkpath');
    expect(text).toContain('STATIC DIAGRAM ONLY');
    expect(text).toContain('range: "category"');
    expect(text).toContain('padding');
    expect(text).toContain('INSIDE');
    expect(text).toContain('Never Scale(');
    expect(text).toContain('ASCII only');
  });
});

describe('createAuthorVegaSpecPrompt radar', () => {
  it('requires a flat sibling marks array', () => {
    const [system] = createAuthorVegaSpecPrompt({
      nlQuery: 'radar of metrics',
      esqlQuery: 'FROM logs-* | STATS value = COUNT() BY key = a',
      dialect: 'vega',
      catalogId: 'radar',
    });
    const text = String((system as [string, string])[1]);
    expect(text).toContain('MARKS ARRAY SHAPE');
    expect(text).toContain('FLAT array');
    expect(text).toContain('Never Scale(');
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
