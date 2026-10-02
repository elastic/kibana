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
  renderSchemaSections,
} from './schema_sections';

const DEF_REF_RE = /"\$ref":"#\/\$defs\/([^"]+)"/g;

const getSectionNames = (chartType: SupportedChartType): string[] =>
  createLoadSchemaSectionsTool(chartType).schema.shape.sections.element.options;

describe('Lens schema sections', () => {
  describe.each(Object.values(SupportedChartType))('%s', (chartType) => {
    it('never offers type or data_source', () => {
      expect(getSectionNames(chartType)).not.toEqual(
        expect.arrayContaining([expect.stringMatching(/^(type|data_source)$/)])
      );
      expect(getSchemaSectionIndex(chartType)).not.toMatch(/^- (type|data_source):/m);
    });

    it('lists one index line per section', () => {
      const names = getSectionNames(chartType);

      expect(getSchemaSectionIndex(chartType).split('\n')).toEqual(
        names.map((name) => expect.stringMatching(new RegExp(`^- ${name}: \\S`)))
      );
    });

    it('renders the sections with every definition they reference', () => {
      const names = getSectionNames(chartType);
      const rendered = renderSchemaSections(chartType, names);
      const { properties, $defs = {} } = JSON.parse(rendered);
      const refs = [...rendered.matchAll(DEF_REF_RE)].map(([, name]) => name);

      expect(Object.keys(properties)).toEqual(names);
      expect(Object.keys($defs)).toEqual(expect.arrayContaining(refs));
    });
  });

  it('lists the values of enum fields so the model does not load a section to learn them', () => {
    expect(getSchemaSectionIndex(SupportedChartType.XY)).toContain(
      'type: area|area_percentage|area_stacked|bar|bar_horizontal|bar_horizontal_stacked|bar_horizontal_percentage|bar_percentage|bar_stacked|line'
    );
    expect(getSchemaSectionIndex(SupportedChartType.Pie)).toContain('donut_hole: none|s|m|l');
  });

  it('lists short value lists of nested fields', () => {
    expect(getSchemaSectionIndex(SupportedChartType.Pie)).toContain(
      'values (visible, mode: absolute|percentage, percent_decimals)'
    );
    expect(getSchemaSectionIndex(SupportedChartType.XY)).toContain('scale: linear|log|sqrt');
  });

  it('keeps the values of every union variant for a shared field', () => {
    const index = getSchemaSectionIndex(SupportedChartType.XY);

    expect(index).toContain('placement: outside|inside');
    expect(index).toMatch(/position: top\|bottom\|left\|right\|/);
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
});
