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

interface XyLayer {
  layerType?: string;
  accessors?: string[];
  splitAccessor?: string;
  yConfig?: Array<{ forAccessor: string; color?: string }>;
}

/**
 * The Lens chart with the series coloured in the accent of the page. Only a layer with one series that is
 * not split by a field is coloured: more than one needs a colour for each, which the palette of
 * Lens gives, and one accent for all of them could not be told apart. Charts of another kind
 * are left as Lens draws them.
 */
export const applyAccentToChart = (
  attributes: Attributes,
  accent: AppTheme['accent'],
  isDarkMode: boolean
): Attributes => {
  const state = attributes.state?.visualization as { layers?: XyLayer[] } | undefined;
  if (!accent || !Array.isArray(state?.layers)) return attributes;

  const colors = ACCENT_COLORS[accent];
  const color = isDarkMode ? colors.textOnDark : colors.fill;

  return {
    ...attributes,
    state: {
      ...attributes.state,
      visualization: {
        ...state,
        layers: state.layers.map((layer) =>
          layer.layerType === 'data' && layer.accessors?.length === 1 && !layer.splitAccessor
            ? {
                ...layer,
                yConfig: layer.accessors.map((forAccessor) => ({
                  ...layer.yConfig?.find((config) => config.forAccessor === forAccessor),
                  forAccessor,
                  color,
                })),
              }
            : layer
        ),
      },
    },
  } as Attributes;
};
