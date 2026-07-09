/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ColorMapping } from '@kbn/coloring';
import type { TypedLensByValueInput, XYVisualizationState } from '@kbn/lens-plugin/public';
import type { EpisodesFilterState } from '../queries/episodes_query';

export interface EpisodeStatusColors {
  danger: string;
  success: string;
  primary: string;
  warning: string;
}

/** Maps episode status values to their display colors. */
export const getStatusColorMap = (colors: EpisodeStatusColors): Record<string, string> => ({
  active: colors.danger,
  inactive: colors.success,
  recovering: colors.primary,
  pending: colors.warning,
});

/**
 * Patches a Lens `TypedLensByValueInput` attributes object to apply episode-aware
 * color coding and strip axis titles.
 *
 * - When `breakdownField` is `'episode.status'`: applies a categorical color
 *   mapping so each status value gets its own color.
 * - When there is no breakdown: colors the whole series to match the active
 *   status filter, falling back to `danger` (red) when no filter is set.
 * - Otherwise: only strips the axis titles (base visualization adjustment).
 */
export const buildModifiedVisAttributes = (
  attributes: TypedLensByValueInput['attributes'],
  breakdownField: string | undefined,
  filterState: EpisodesFilterState,
  colors: EpisodeStatusColors
): TypedLensByValueInput['attributes'] => {
  const visualization = attributes.state?.visualization as XYVisualizationState | undefined;
  if (!visualization?.layers) return attributes;

  const baseVisualization: XYVisualizationState = {
    ...visualization,
    axisTitlesVisibilitySettings: {
      yLeft: visualization.axisTitlesVisibilitySettings?.yLeft ?? false,
      yRight: visualization.axisTitlesVisibilitySettings?.yRight ?? false,
      x: false,
    },
  };

  const applyColorMapping = (colorMapping: ColorMapping.Config) => ({
    ...attributes,
    state: {
      ...attributes.state,
      visualization: {
        ...baseVisualization,
        layers: baseVisualization.layers.map((layer) =>
          layer.layerType === 'data' ? { ...layer, colorMapping } : layer
        ),
      },
    },
  });

  if (breakdownField === 'episode.status') {
    return applyColorMapping({
      paletteId: 'default',
      colorMode: { type: 'categorical' },
      assignments: [
        {
          rules: [{ type: 'match', pattern: 'active', matchEntireWord: true }],
          color: { type: 'colorCode', colorCode: colors.danger },
          touched: true,
        },
        {
          rules: [{ type: 'match', pattern: 'inactive', matchEntireWord: true }],
          color: { type: 'colorCode', colorCode: colors.success },
          touched: true,
        },
        {
          rules: [{ type: 'match', pattern: 'recovering', matchEntireWord: true }],
          color: { type: 'colorCode', colorCode: colors.primary },
          touched: true,
        },
        {
          rules: [{ type: 'match', pattern: 'pending', matchEntireWord: true }],
          color: { type: 'colorCode', colorCode: colors.warning },
          touched: true,
        },
      ],
      specialAssignments: [{ rules: [{ type: 'other' }], color: { type: 'loop' }, touched: false }],
    });
  }

  // When no breakdown is selected but a single status is filtered, colour the whole
  // series to match the status — so the chart stays visually consistent with the filter.
  // Fall back to danger (red) when no status filter is active so the no-breakdown,
  // no-filter state still has a meaningful colour rather than the Lens palette default.
  const statusColorMap = getStatusColorMap(colors);
  const statusColor =
    (filterState.status ? statusColorMap[filterState.status] : undefined) ?? colors.danger;

  if (!breakdownField) {
    return {
      ...attributes,
      state: {
        ...attributes.state,
        visualization: {
          ...baseVisualization,
          layers: baseVisualization.layers.map((layer) => {
            if (layer.layerType !== 'data') return layer;
            const existingYConfig = layer.yConfig ?? [];
            const yConfig = (layer.accessors as string[]).map((acc) => {
              const existing = existingYConfig.find((yc) => yc.forAccessor === acc);
              return { ...existing, forAccessor: acc, color: statusColor };
            });
            return { ...layer, yConfig };
          }),
        },
      },
    };
  }

  return { ...attributes, state: { ...attributes.state, visualization: baseVisualization } };
};
