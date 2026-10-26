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
  /** The fields a donut is cut by. */
  primaryGroups?: string[];
  yConfig?: Array<{ forAccessor: string; color?: string }>;
}

/**
 * The Lens chart in the accent of the page: a layer of one series that is not broken down takes the
 * accent itself. Anything with several values, a breakdown, a donut, or more than one series, is left
 * to the palette of Lens, as one accent for all of them could not be told apart.
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
          // A layer broken down by a field, and a donut, keep the palette of Lens, which tells their
          // values apart. Lens gives every layer a colour mapping, even where nothing uses it.
          if (layer.splitAccessor !== undefined || layer.primaryGroups !== undefined) return layer;
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
