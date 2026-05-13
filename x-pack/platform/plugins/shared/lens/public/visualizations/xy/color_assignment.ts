/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq, mapValues } from 'lodash';
import type { PaletteRegistry } from '@kbn/coloring';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { euiLightVars } from '@kbn/ui-theme';
import { getResolvedAnnotationColor, isRangeAnnotationConfig } from '@kbn/event-annotation-common';
import type { AccessorConfig } from '@kbn/visualization-ui-components';
import type { FramePublicAPI } from '@kbn/lens-common';
import { getColumnToLabelMap } from './state_helpers';
import type { FormatFactory } from '../../../common/types';
import { isDataLayer, isReferenceLayer, isAnnotationsLayer } from './visualization_helpers';
import { getAnnotationsAccessorColorConfig } from './annotations/helpers';
import {
  getReferenceLineAccessorColorConfig,
  getSingleColorConfig,
} from './reference_line_helpers';
import type { XYDataLayerConfig, XYLayerConfig } from './types';
import { getDefaultPalette } from './default_palette';

const isPrimitive = (value: unknown): boolean => value != null && typeof value !== 'object';

export const defaultReferenceLineColor = euiLightVars.euiColorDarkShade;

export const getLayerPaletteName = (layer: XYDataLayerConfig): string =>
  layer.collapseFn
    ? getDefaultPalette(layer.seriesType)
    : layer.colorMapping?.paletteId ?? layer.palette?.name ?? getDefaultPalette(layer.seriesType);

const getPaletteDefinition = (paletteService: PaletteRegistry, paletteName: string) =>
  paletteService.get(paletteName) ?? paletteService.get('default');

export type ColorAssignments = Record<
  string,
  {
    totalSeriesCount: number;
    getRank(sortedLayer: XYDataLayerConfig, seriesKey: string, yAccessor: string): number;
  }
>;

export function getColorAssignments(
  layers: XYLayerConfig[],
  data: { tables: Record<string, Datatable> },
  formatFactory: FormatFactory
): ColorAssignments {
  const layersPerPalette: Record<string, XYDataLayerConfig[]> = {};

  layers.filter(isDataLayer).forEach((layer) => {
    const palette = getLayerPaletteName(layer);
    if (!layersPerPalette[palette]) {
      layersPerPalette[palette] = [];
    }
    layersPerPalette[palette].push(layer);
  });

  return mapValues(layersPerPalette, (paletteLayers) => {
    const seriesPerLayer = paletteLayers.map((layer, layerIndex) => {
      if (layer.collapseFn || !layer.splitAccessors || layer.splitAccessors.length === 0) {
        return { numberOfSeries: layer.accessors.length, splits: [] };
      }
      const splitAccessors = layer.splitAccessors;
      const columns = data.tables[layer.layerId]?.columns.filter(({ id }) =>
        splitAccessors.includes(id)
      );

      const splits =
        !columns || columns.length === 0 || !data.tables[layer.layerId]
          ? []
          : uniq(
              data.tables[layer.layerId].rows.flatMap((row) => {
                return columns.map((column) => {
                  let value = row[column.id];
                  if (value && !isPrimitive(value)) {
                    const columnFormatter = formatFactory(column.meta.params);
                    value = columnFormatter?.convert(value) ?? value;
                  } else {
                    value = String(value);
                  }
                  return value;
                });
              })
            );
      return { numberOfSeries: (splits.length || 1) * layer.accessors.length, splits };
    });
    const totalSeriesCount = seriesPerLayer.reduce(
      (sum, perLayer) => sum + perLayer.numberOfSeries,
      0
    );
    return {
      totalSeriesCount,
      getRank(sortedLayer: XYDataLayerConfig, seriesKey: string, yAccessor: string) {
        const layerIndex = paletteLayers.findIndex((l) => sortedLayer.layerId === l.layerId);
        const currentSeriesPerLayer = seriesPerLayer[layerIndex];
        const splitRank = currentSeriesPerLayer.splits.indexOf(seriesKey);
        return (
          (layerIndex === 0
            ? 0
            : seriesPerLayer
                .slice(0, layerIndex)
                .reduce((sum, perLayer) => sum + perLayer.numberOfSeries, 0)) +
          (sortedLayer.splitAccessors && splitRank !== -1
            ? splitRank * sortedLayer.accessors.length
            : 0) +
          sortedLayer.accessors.indexOf(yAccessor)
        );
      },
    };
  });
}

function getDisabledConfig(accessor: string): AccessorConfig {
  return {
    columnId: accessor,
    triggerIconType: 'disabled',
  };
}

export function getAssignedColorConfig(
  layer: XYLayerConfig,
  accessor: string,
  colorAssignments: ColorAssignments,
  frame: Pick<FramePublicAPI, 'datasourceLayers'>,
  paletteService: PaletteRegistry,
  isDarkMode = false
): AccessorConfig {
  if (isReferenceLayer(layer)) {
    return getSingleColorConfig(accessor);
  }
  if (isAnnotationsLayer(layer)) {
    const annotation = layer.annotations.find((a) => a.id === accessor);
    return {
      columnId: accessor,
      triggerIconType: annotation?.isHidden ? 'invisible' : 'color',
      color: getResolvedAnnotationColor({
        color: annotation?.color,
        isDarkMode,
        isRange: isRangeAnnotationConfig(annotation),
      }),
    };
  }
  const layerContainsSplits =
    isDataLayer(layer) && !layer.collapseFn && (layer.splitAccessors ?? []).length > 0;
  const currentPaletteName = getLayerPaletteName(layer);
  const currentPaletteParams = layer.palette?.params;
  const totalSeriesCount = colorAssignments[currentPaletteName]?.totalSeriesCount;

  if (layerContainsSplits) {
    return getDisabledConfig(accessor);
  }

  const columnToLabel = getColumnToLabelMap(layer, frame.datasourceLayers[layer.layerId]);
  const rank = colorAssignments[currentPaletteName].getRank(
    layer,
    columnToLabel[accessor] || accessor,
    accessor
  );
  const assignedColor =
    totalSeriesCount != null
      ? getPaletteDefinition(paletteService, currentPaletteName).getCategoricalColor(
          [
            {
              name: columnToLabel[accessor] || accessor,
              rankAtDepth: rank,
              totalSeriesAtDepth: totalSeriesCount,
            },
          ],
          { maxDepth: 1, totalSeries: totalSeriesCount },
          currentPaletteParams
        )
      : undefined;
  return {
    columnId: accessor,
    triggerIconType: assignedColor ? 'color' : 'disabled',
    color: assignedColor ?? undefined,
  };
}

export function getAccessorColorConfigs(
  colorAssignments: ColorAssignments,
  frame: Pick<FramePublicAPI, 'datasourceLayers'>,
  layer: XYLayerConfig,
  paletteService: PaletteRegistry,
  isDarkMode = false
): AccessorConfig[] {
  if (isReferenceLayer(layer)) {
    return getReferenceLineAccessorColorConfig(layer);
  }
  if (isAnnotationsLayer(layer)) {
    return getAnnotationsAccessorColorConfig(layer, isDarkMode);
  }
  const layerContainsSplits = !layer.collapseFn && (layer.splitAccessors ?? []).length > 0;
  return layer.accessors.map((accessor) => {
    if (layerContainsSplits) {
      return getDisabledConfig(accessor);
    }
    const currentYConfig = layer.yConfig?.find((yConfig) => yConfig.forAccessor === accessor);
    if (currentYConfig?.color) {
      return {
        columnId: accessor,
        triggerIconType: 'color',
        color: currentYConfig.color,
      };
    }
    return getAssignedColorConfig(
      layer,
      accessor,
      colorAssignments,
      frame,
      paletteService,
      isDarkMode
    );
  });
}
