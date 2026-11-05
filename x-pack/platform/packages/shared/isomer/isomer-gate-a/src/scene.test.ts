/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { metricExamples, resolveChart, xyChartExamples } from '@kbn/isomer';
import { normalizeScene } from './scene';

describe('normalizeScene', () => {
  it("reads a metric tile's texts in drawing order, labels in chrome text", () => {
    const scene = resolveChart(metricExamples[0].node, { scheme: 'light' });
    if (scene.kind !== 'metric') {
      throw new Error('Not a metric Scene.');
    }
    const [tile] = scene.tiles;
    const normalized = normalizeScene(scene);
    expect(normalized).toEqual({
      kind: 'metric',
      tiles: [
        expect.objectContaining({
          texts: expect.arrayContaining([
            { text: tile.title, color: scene.chrome.text.toLowerCase() },
            { text: tile.value.text, color: tile.value.color.toLowerCase() },
          ]),
        }),
      ],
    });
  });

  it("reads an xy Scene's legend, axes and series without geometry", () => {
    const scene = resolveChart(xyChartExamples[0].node, { scheme: 'dark' });
    if (scene.kind !== 'xy') {
      throw new Error('Not an xy Scene.');
    }
    const normalized = normalizeScene(scene);
    if (normalized.kind !== 'xy') {
      throw new Error('Not normalized as xy.');
    }
    expect(normalized.series.map(({ name }) => name).sort()).toEqual(
      scene.series.map(({ label }) => label).sort()
    );
    expect(normalized.axes[0].labels).toEqual(scene.axes.x.ticks.map(({ label }) => label));
    expect(normalized.axes.every(({ gridlines }) => gridlines === undefined)).toBe(true);
  });
});
