/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { chartTypeRegistry } from './chart_type_registry';
import {
  createLoadSchemaSectionsTool,
  getFailingSchemaSections,
  getSchemaSectionIndex,
  getSchemaSectionNames,
  renderSchemaSections,
} from './schema_sections';

const DEF_REF_RE = /"\$ref":"#\/\$defs\/([^"]+)"/g;

describe('Lens schema sections', () => {
  describe.each(Object.values(SupportedChartType))('%s', (chartType) => {
    it('never offers type or data_source', () => {
      expect(getSchemaSectionNames(chartType)).not.toEqual(
        expect.arrayContaining([expect.stringMatching(/^(type|data_source)$/)])
      );
      expect(getSchemaSectionIndex(chartType)).not.toMatch(/^- (type|data_source):/m);
    });

    it('lists one index line per section', () => {
      const names = getSchemaSectionNames(chartType);

      expect(getSchemaSectionIndex(chartType).split('\n')).toEqual(
        names.map((name) => expect.stringMatching(new RegExp(`^- ${name}: \\S`)))
      );
    });

    it('renders the sections with every definition they reference', () => {
      const names = getSchemaSectionNames(chartType);
      const rendered = renderSchemaSections(chartType, names);
      const { properties, $defs = {} } = JSON.parse(rendered);
      const refs = [...rendered.matchAll(DEF_REF_RE)].map(([, name]) => name);

      expect(Object.keys(properties)).toEqual(names);
      expect(Object.keys($defs)).toEqual(expect.arrayContaining(refs));
    });
  });

  it('lists the values of enum fields so the model does not load a section to learn them', () => {
    expect(getSchemaSectionIndex(SupportedChartType.XY)).toContain(
      'type*: area|area_percentage|area_stacked|bar|bar_horizontal|bar_horizontal_stacked|bar_horizontal_percentage|bar_percentage|bar_stacked|line'
    );
    expect(getSchemaSectionIndex(SupportedChartType.Pie)).toContain('donut_hole: none|s|m|l');
  });

  it('lists short value lists of nested fields', () => {
    expect(getSchemaSectionIndex(SupportedChartType.Pie)).toContain(
      'values (visible, mode: absolute|percentage, percent_decimals)'
    );
    expect(getSchemaSectionIndex(SupportedChartType.XY)).toContain('scale: linear|log|sqrt');
  });

  it('marks required fields', () => {
    const index = getSchemaSectionIndex(SupportedChartType.Metric);

    expect(index).toContain('- metrics: column*, label, format (type*, decimals');
    expect(index).toContain('breakdown_by: column*, label,');
  });

  describe('union sections', () => {
    const getVariants = (chartType: SupportedChartType, section: string) => {
      const line = getSchemaSectionIndex(chartType)
        .split('\n')
        .find((indexLine) => indexLine.startsWith(`- ${section}: `));
      const [sharedFields = '', variants = ''] = line?.split('one of: ') ?? [];
      return { sharedFields, variants: variants.split(' | ') };
    };

    it('lists the fields of each variant separately', () => {
      const {
        variants: [primary, secondary],
      } = getVariants(SupportedChartType.Metric, 'metrics');

      expect(primary).toMatch(/^\(type\*: primary, /);
      expect(primary).toContain('background_chart');
      expect(primary).not.toContain('compare');
      expect(secondary).toMatch(/^\(type\*: secondary, /);
      expect(secondary).toContain('compare');
      expect(secondary).not.toContain('background_chart');
    });

    it('lists the fields every variant shares once', () => {
      const { sharedFields, variants } = getVariants(SupportedChartType.XY, 'legend');

      expect(sharedFields).toContain('statistics: min|max|avg');
      expect(variants).toEqual([
        expect.stringMatching(/^\(placement: outside, .*position: top\|bottom\)$/),
        expect.stringMatching(/^\(placement: outside, .*position: left\|right, size: /),
        expect.stringMatching(/^\(placement\*: inside, .*position: top_left\|/),
      ]);
      variants.forEach((variant) => expect(variant).not.toContain('statistics'));
    });

    it('marks a field required only in the variants that require it', () => {
      const { variants } = getVariants(SupportedChartType.XY, 'legend');

      expect(variants.map((variant) => variant.match(/^\((placement\*?): /)?.[1])).toEqual([
        'placement',
        'placement',
        'placement*',
      ]);
    });
  });

  it('limits xy layers to ES|QL data layers that the model writes without a data source', () => {
    const { properties, $defs = {} } = JSON.parse(
      renderSchemaSections(SupportedChartType.XY, ['layers'])
    );
    const { items } = properties.layers;
    const layer = items.$ref ? $defs[items.$ref.replace('#/$defs/', '')] : items;

    expect(Object.keys(layer.properties)).toEqual(
      expect.arrayContaining(['type', 'x', 'y', 'breakdown_by'])
    );
    expect(layer.properties).not.toHaveProperty('data_source');
    expect(layer.properties).not.toHaveProperty('thresholds');
    expect(layer.required ?? []).not.toContain('sampling');
  });

  it('maps validation issues to the sections that hold them', () => {
    const result = chartTypeRegistry[SupportedChartType.Metric].schema.safeParse({
      type: 'metric',
      data_source: { type: 'esql', query: 'FROM logs-* | STATS count = COUNT()' },
      metrics: [{ type: 'primary', column: 'count', apply_color_to: 'everywhere' }],
      styling: { primary: { position: 'sideways' } },
    });

    expect(result.success).toBe(false);
    expect(getFailingSchemaSections(SupportedChartType.Metric, result.error).sort()).toEqual([
      'metrics',
      'styling',
    ]);
  });

  it('finds no failing sections for errors other than validation errors', () => {
    expect(getFailingSchemaSections(SupportedChartType.Metric, new Error('boom'))).toEqual([]);
  });

  it('accepts only known sections in the tool call', () => {
    const { schema } = createLoadSchemaSectionsTool(SupportedChartType.XY);

    expect(schema.safeParse({ sections: ['legend', 'axis'] }).success).toBe(true);
    expect(schema.safeParse({ sections: ['data_source'] }).success).toBe(false);
  });

  // The index goes into every config prompt verbatim, so any change to it shows up here for review.
  it.each(Object.values(SupportedChartType))('keeps the %s section index', (chartType) => {
    expect(getSchemaSectionIndex(chartType)).toMatchSnapshot();
  });
});
