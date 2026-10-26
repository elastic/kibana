/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { AppTheme } from '@kbn/custom-app-common';
import { ACCENT_COLORS } from './page_theme';

type Attributes = TypedLensByValueInput['attributes'];

interface ChartLayer {
  layerType?: string;
  accessors?: string[];
  splitAccessor?: string;
  yConfig?: Array<{ forAccessor: string; color?: string }>;
  /** How the values of a breakdown or the slices of a donut are coloured, as Lens keeps it. */
  colorMapping?: { assignments?: unknown[]; colorMode?: unknown } & Record<string, unknown>;
}

/**
 * The values of a breakdown, or the slices of a donut, from the accent to a fainter one of it, one
 * shade for each, as Lens's own gradient colouring does for a single colour. Nothing is assigned to
 * a value by name, so any values the query gives are coloured.
 */
const toAccentGradient = (
  colorMapping: NonNullable<ChartLayer['colorMapping']>,
  color: string
): NonNullable<ChartLayer['colorMapping']> => ({
  ...colorMapping,
  assignments: [],
  colorMode: { type: 'gradient', steps: [{ type: 'colorCode', colorCode: color }], sort: 'desc' },
});

/**
 * The Lens chart in the accent of the page. A layer that is broken down by a field, and a donut,
 * take shades of the accent, one for each value; a layer of one series that is not broken down takes
 * the accent itself. More than one series with no breakdown is left to the palette of Lens, as one
 * accent for all of them could not be told apart.
 */
export const applyAccentToChart = (
  attributes: Attributes,
  accent: AppTheme['accent'],
  isDarkMode: boolean
): Attributes => {
  const state = attributes.state?.visualization as { layers?: ChartLayer[] } | undefined;
  if (!accent || !Array.isArray(state?.layers)) return attributes;

  const colors = ACCENT_COLORS[accent];
  const color = isDarkMode ? colors.textOnDark : colors.fill;

  return {
    ...attributes,
    state: {
      ...attributes.state,
      visualization: {
        ...state,
        layers: state.layers.map((layer) => {
          if (layer.layerType !== 'data') return layer;
          if (layer.colorMapping) {
            return { ...layer, colorMapping: toAccentGradient(layer.colorMapping, color) };
          }
          return layer.accessors?.length === 1 && !layer.splitAccessor
            ? {
                ...layer,
                yConfig: layer.accessors.map((forAccessor) => ({
                  ...layer.yConfig?.find((config) => config.forAccessor === forAccessor),
                  forAccessor,
                  color,
                })),
              }
            : layer;
        }),
      },
    },
  } as Attributes;
};
