/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { gaugeConfigSchemaESQL } from '@kbn/lens-embeddable-utils';
import { getPalettes } from '@kbn/palettes';
import { getColorConfigPromptContent } from './color_palettes';
import { createGenerateConfigPrompt } from './prompts';

describe('XY color edits', () => {
  it('tells the author to remove color overrides without removing column bindings', () => {
    const prompt = getColorConfigPromptContent(SupportedChartType.XY);

    expect(prompt).toContain(
      'remove the affected `layers[].y[].color` and `layers[].breakdown_by.color` overrides'
    );
    expect(prompt).toContain('while retaining the metrics and breakdown bindings');
    expect(prompt).toContain('Use Lens defaults, not replacement hex values');
  });
});

describe('gauge palette previews', () => {
  const gradientPalettes = getPalettes(false)
    .getAll()
    .filter(({ legacy, type }) => !legacy && type === 'gradient');

  it('provides four-stop palettes when creating a gauge', () => {
    const prompt = getColorConfigPromptContent(SupportedChartType.Gauge);

    expect(prompt.match(/Available dynamic palettes/g)).toHaveLength(1);
    for (const palette of gradientPalettes) {
      expect(prompt).toContain(`- ${palette.name}: ${palette.colors(4).join(', ')}`);
    }
  });

  it.each([3, 4, 5])(
    'provides both default and existing-count palettes when editing a %i-band gauge',
    (bandCount) => {
      const existingConfig = gaugeConfigSchemaESQL.parse({
        type: 'gauge',
        data_source: { type: 'esql', query: 'FROM metrics | STATS latency = AVG(latency)' },
        metric: {
          column: 'latency',
          color: {
            type: 'dynamic',
            range: 'absolute',
            steps: Array.from({ length: bandCount }, (_, index) => ({
              gte: index * 100,
              lt: (index + 1) * 100,
              color: '#ff0000',
            })),
          },
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

      expect(prompt.match(/Available dynamic palettes/g)).toHaveLength(bandCount === 4 ? 1 : 2);
      for (const palette of gradientPalettes) {
        expect(prompt).toContain(`- ${palette.name}: ${palette.colors(bandCount).join(', ')}`);
        expect(prompt).toContain(`- ${palette.name}: ${palette.colors(4).join(', ')}`);
      }
    }
  );
});
