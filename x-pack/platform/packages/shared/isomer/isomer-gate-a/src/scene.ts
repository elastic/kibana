/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricScene, MetricTile, Scene, XyScene } from '@kbn/isomer';
import { normalizeColor } from './colors';
import type { NormalizedAxis, NormalizedChart, NormalizedText, NormalizedXy } from './model';
import { SERIES_MARK_ORDER } from './model';

const tileTexts = (
  tile: MetricTile,
  { layout: { valuePosition }, chrome }: MetricScene
): NormalizedText[] => {
  // A tile's title and subtitle have no color of their own: renderers draw them in chrome text.
  const labelColor = normalizeColor(chrome.text);
  const labels: NormalizedText[] = [
    { text: tile.title, color: labelColor },
    ...(tile.subtitle ? [{ text: tile.subtitle, color: labelColor }] : []),
  ];
  const value: NormalizedText = { text: tile.value.text, color: normalizeColor(tile.value.color) };
  const secondary: NormalizedText[] = tile.secondary
    ? [{ text: tile.secondary.text, color: normalizeColor(tile.secondary.color) }]
    : [];
  return valuePosition === 'top'
    ? [value, ...labels, ...secondary]
    : [...labels, value, ...secondary];
};

const normalizeMetricScene = (scene: MetricScene): NormalizedChart => ({
  kind: 'metric',
  tiles: scene.tiles.map((tile) => ({
    background: normalizeColor(tile.background),
    texts: tileTexts(tile, scene),
  })),
});

const normalizeXyScene = ({ axes, legend, layers, categories }: XyScene): NormalizedXy => {
  const series = layers.flatMap((layer) => (layer.kind === 'series' ? [layer.series] : []));
  // On an ordinal axis a mark's x is its category's key; Kibana reports the category's label.
  const categoryLabels = new Map(categories.map(({ x, label }) => [x, label]));
  return {
    kind: 'xy',
    legend: legend.items.map(({ label, color }) => ({ name: label, color: normalizeColor(color) })),
    axes: [axes.x, axes.y, axes.y2]
      .filter((axis): axis is NonNullable<typeof axis> => axis !== undefined)
      .map(({ position, title }): NormalizedAxis => ({ position, ...(title ? { title } : {}) })),
    series: SERIES_MARK_ORDER.flatMap((mark) =>
      series
        .filter((item) => item.mark === mark)
        .map(({ label, color, marks }) => ({
          mark,
          name: label,
          color: normalizeColor(color),
          values: marks.map(({ x, y }) => ({
            x: axes.x.scale === 'ordinal' ? categoryLabels.get(x) ?? x : x,
            y,
          })),
        }))
    ),
  };
};

/**
 * What a Scene tells every renderer to draw, in the shape an engine's output normalizes to, so a
 * Scene can be checked against Kibana before an engine draws it. A Scene has no geometry, and no
 * ticks: the engine chooses those.
 */
export const normalizeScene = (scene: Scene): NormalizedChart => {
  if (scene.kind === 'metric') {
    return normalizeMetricScene(scene);
  }
  if (scene.kind === 'xy') {
    return normalizeXyScene(scene);
  }
  throw new Error(`Gate A compares metric and xy Scenes, not ${scene.kind}.`);
};
