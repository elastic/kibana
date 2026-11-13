/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChartHint } from '@kbn/isomer-charts-elastic';

/* eslint-disable @typescript-eslint/no-explicit-any */
type LensHint = Record<string, any>;

const CURVES: Record<string, 'linear' | 'monotone' | 'step'> = {
  LINEAR: 'linear',
  CURVE_MONOTONE_X: 'monotone',
  CURVE_STEP_AFTER: 'step',
};

const axisOf = (lens: LensHint | undefined) =>
  lens === undefined
    ? undefined
    : {
        ...(lens.title === undefined ? {} : { title: lens.title }),
        ...(lens.tickLabels === undefined ? {} : { ticks: lens.tickLabels }),
        ...(lens.gridlines === undefined ? {} : { gridlines: lens.gridlines }),
        ...(typeof lens.labelOrientation === 'number'
          ? { labelRotation: lens.labelOrientation }
          : {}),
      };

/** The converter's Lens-shaped hint as the Elastic Charts engine's presentation contract. */
export const engineHintFromLens = (
  hint: LensHint,
  node: { annotations?: Array<{ key: string }> } | undefined
): ChartHint => {
  const axes = Object.fromEntries(
    ['x', 'y', 'y2'].flatMap((id) => {
      const translated = axisOf(hint.axes?.[id]);
      return translated === undefined ? [] : [[id, translated]];
    })
  );
  // An annotation's key starts with its Lens layer id, which keys the layer's color and icon.
  const byLayer = (key: string) => hint.annotations?.byAnnotation?.[String(key).split(':')[0]];
  const annotationColors = Object.fromEntries(
    (node?.annotations ?? []).flatMap(({ key }) => {
      const color = byLayer(key)?.color;
      return /^#[0-9a-fA-F]{6}$/.test(color ?? '') ? [[key, color]] : [];
    })
  );
  const icons = Object.fromEntries(
    (node?.annotations ?? []).flatMap(({ key }) => {
      const icon = byLayer(key)?.icon;
      return ['alert', 'asterisk', 'bell'].includes(icon) ? [[key, icon]] : [];
    })
  );
  // Scraped from Lens's legend, so what Lens drew; the computed set is the converter's own fallback.
  const seriesColors = { ...hint.colors, ...(hint.seriesColors ?? hint.computedSeriesColors) };
  const colors =
    Object.keys(seriesColors).length === 0 && Object.keys(annotationColors).length === 0
      ? undefined
      : { ...seriesColors, ...annotationColors };
  return {
    ...(hint.legend === undefined
      ? {}
      : {
          legend: {
            show: hint.legend.show,
            ...(['top', 'bottom', 'left', 'right'].includes(hint.legend.position)
              ? { position: hint.legend.position }
              : {}),
          },
        }),
    ...(colors === undefined ? {} : { colors }),
    ...(hint.valueLabels === undefined ? {} : { valueLabels: hint.valueLabels }),
    ...(Object.keys(icons).length === 0 ? {} : { icons }),
    ...(['horizontal', 'vertical'].includes(hint.progress) ? { progress: hint.progress } : {}),
    ...(typeof hint.cellLabels === 'boolean' ? { valueLabels: hint.cellLabels } : {}),
    ...(typeof hint.fillOpacity === 'number' ? { fillOpacity: hint.fillOpacity } : {}),
    ...(CURVES[hint.curve] === undefined ? {} : { curve: CURVES[hint.curve] }),
    ...(Object.keys(axes).length === 0 ? {} : { axes }),
    ...(hint.shape === 'pie' ? { pie: true } : {}),
    ...(typeof hint.percentDecimals === 'number' ? { percentDecimals: hint.percentDecimals } : {}),
    ...(['value', 'percent', 'hidden'].includes(hint.numberDisplay)
      ? { values: hint.numberDisplay }
      : {}),
  } as ChartHint;
};
