/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  datatableConfigSchemaESQL,
  gaugeConfigSchemaESQL,
  metricConfigSchemaESQL,
} from '@kbn/lens-embeddable-utils';
import { getPalettes } from '@kbn/palettes';
import { getColorConfigPromptContent } from './color_palettes';
import { createGenerateConfigPrompt } from './prompts';

const buildSteps = (bandCount: number) =>
  Array.from({ length: bandCount }, (_, index) => ({
    gte: index * 100,
    lt: (index + 1) * 100,
    color: '#ff0000',
  }));

describe('palette previews', () => {
  const gradientPalettes = getPalettes(false)
    .getAll()
    .filter(({ legacy, type }) => !legacy && type === 'gradient');

  const expectDynamicPreviews = (prompt: string, bandCounts: number[]) => {
    expect(prompt.match(/Dynamic palettes \(/g)).toHaveLength(bandCounts.length);
    for (const palette of gradientPalettes) {
      for (const bandCount of bandCounts) {
        expect(prompt).toContain(`- ${palette.name}: ${palette.colors(bandCount).join(', ')}`);
      }
    }
  };

  it('provides four-stop palettes when creating a gauge', () => {
    const prompt = getColorConfigPromptContent(SupportedChartType.Gauge);

    expectDynamicPreviews(prompt, [4]);
  });

  it.each([3, 4, 5])(
    'provides both default and existing-count palettes when editing a %i-band gauge',
    (bandCount) => {
      const existingConfig = gaugeConfigSchemaESQL.parse({
        type: 'gauge',
        data_source: { type: 'esql', query: 'FROM metrics | STATS latency = AVG(latency)' },
        metric: {
          column: 'latency',
          color: { type: 'dynamic', range: 'absolute', steps: buildSteps(bandCount) },
        },
      });
      const prompt = JSON.stringify(
        createGenerateConfigPrompt({
          nlQuery: 'Change the palette to Cool',
          esqlQuery: existingConfig.data_source.query,
          chartType: SupportedChartType.Gauge,
          schema: {},
          existingConfig: JSON.stringify(existingConfig),
          parsedExistingConfig: existingConfig,
        })
      );

      expectDynamicPreviews(prompt, bandCount === 4 ? [4] : [4, bandCount]);
    }
  );

  it('adds the existing band count when editing a metric with custom steps', () => {
    const existingConfig = metricConfigSchemaESQL.parse({
      type: 'metric',
      data_source: { type: 'esql', query: 'FROM metrics | STATS cpu = AVG(cpu)' },
      metrics: [
        {
          type: 'primary',
          column: 'cpu',
          color: { type: 'dynamic', range: 'absolute', steps: buildSteps(5) },
        },
      ],
    });

    const prompt = getColorConfigPromptContent(SupportedChartType.Metric, existingConfig);

    expectDynamicPreviews(prompt, [3, 5]);
    expect(prompt).toContain('or the existing step count when editing one');
  });

  it('adds every column band count when editing a datatable with stepped columns', () => {
    const existingConfig = datatableConfigSchemaESQL.parse({
      type: 'data_table',
      data_source: { type: 'esql', query: 'FROM metrics | STATS cpu = AVG(cpu), mem = AVG(mem)' },
      metrics: [
        {
          column: 'cpu',
          color: { type: 'dynamic', range: 'absolute', steps: buildSteps(3) },
        },
        {
          column: 'mem',
          color: { type: 'dynamic', range: 'absolute', steps: buildSteps(4) },
        },
      ],
    });

    const prompt = getColorConfigPromptContent(SupportedChartType.Datatable, existingConfig);

    expectDynamicPreviews(prompt, [5, 3, 4]);
  });
});
