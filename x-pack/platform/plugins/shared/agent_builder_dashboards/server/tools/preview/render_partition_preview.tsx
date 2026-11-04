/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ComponentType } from 'react';
import chroma from 'chroma-js';
import moment from 'moment-timezone';
import {
  LegendValue,
  PATH_KEY,
  Partition,
  PartitionLayout,
  Position,
  Settings,
} from '@elastic/charts';
import type {
  ArrayEntry,
  ArrayNode,
  Datum,
  NodeColorAccessor,
  PartialTheme,
  PartitionLayer,
  SeriesIdentifier,
} from '@elastic/charts';
import {
  IconChartDonut,
  IconChartMosaic,
  IconChartPie,
  IconChartTreemap,
  IconChartWaffle,
} from '@kbn/chart-icons';
import { getColorFactory } from '@kbn/coloring';
import {
  PARTITION_EMPTY_SIZE_RADIUS,
  type LensPartitionLayerState,
  type LensPartitionVisualizationState,
  type TextBasedLayerColumn,
} from '@kbn/lens-common';
import { LensConfigBuilder, lensApiConfigSchema } from '@kbn/lens-embeddable-utils';
import { euiThemeVars } from '@kbn/ui-theme';
import {
  PREVIEW_CHART_HEIGHT,
  PREVIEW_WIDTH,
  framePreviewSvg,
  renderChartPreviewSvg,
} from './preview_frame';
import { emptyPlaceholderSvg, euiIconSvg } from './preview_icons';
import { getPreviewPalettes } from './preview_palettes';
import {
  DATE_TYPES,
  NUMBER_TYPES,
  getColumnType,
  getDataSourceQuery,
  toRows,
} from './preview_table';
import type { PanelPreviewRenderer, PreviewContext, PreviewTable } from './types';
import { getValueFormatter, type ValueFormat } from './value_format';

interface PartitionColumn {
  column: string;
  label?: string;
  format?: ValueFormat;
}

interface PartitionPreviewConfig {
  type: string;
  title?: string;
  data_source?: { type?: string; query?: string };
  metrics?: PartitionColumn[];
  metric?: PartitionColumn;
  group_by?: PartitionColumn[];
  group_breakdown_by?: PartitionColumn[];
}

type Row = Record<string, unknown>;
type PartitionShape = LensPartitionVisualizationState['shape'];

// The constants below follow the Lens `toExpression` and the partition vis renderer
// (`PartitionVisComponent`, `getLayers`, `getColor`, `getPartitionTheme`, `getPartitionFillColor`,
// `consolidateMetricColumns` and the legend utils).
const LAYOUTS: Record<PartitionShape, PartitionLayout> = {
  pie: PartitionLayout.sunburst,
  donut: PartitionLayout.sunburst,
  treemap: PartitionLayout.treemap,
  mosaic: PartitionLayout.mosaic,
  waffle: PartitionLayout.waffle,
};
// `LegendSizeToPixels`; Lens leaves the size to the content (`auto`) by default.
const LEGEND_SIZES: Record<string, number | undefined> = {
  small: 80,
  medium: 130,
  large: 180,
  xlarge: 230,
};
const DEFAULT_PERCENT_DECIMALS = 2;
const METRIC_NAME_COLUMN = 'metric-name';
const VALUE_COLUMN = 'value';
const NULL_LABEL = '(null)';
const EMPTY_LABEL = '(empty)';
const TRANSPARENT = 'rgba(0,0,0,0)';
// `getColor` falls back to a transparent white when the palette has no color.
const NO_COLOR = 'rgba(255,255,255,0)';
// The legacy palettes of the charts plugin (`buildPalettes`): round-robin ones and gradients,
// by legacy palette name, with the Kibana palette each one draws from.
const ROUND_ROBIN_PALETTES: Record<string, string> = {
  default: 'default',
  elastic_line_optimized: 'elastic_line_optimized',
};
const GRADIENT_PALETTES: Record<string, string> = {
  status: 'status',
  temperature: 'temperature',
  complementary: 'complementary',
  negative: 'red',
  positive: 'green',
  cool: 'cool',
  warm: 'warm',
  gray: 'gray',
};
// The icons the partition vis shows when there is nothing to draw (`getIcon`).
const CHART_ICONS: Record<PartitionShape, ComponentType> = {
  pie: IconChartPie,
  donut: IconChartDonut,
  treemap: IconChartTreemap,
  mosaic: IconChartMosaic,
  waffle: IconChartWaffle,
};
// `EmptyPlaceholder` draws its icon at the large EUI size.
const EMPTY_ICON_SIZE = 24;

const COLLAPSE_FNS: Record<string, (values: number[]) => number> = {
  sum: (values) => values.reduce((sum, value) => sum + value, 0),
  avg: (values) => values.reduce((sum, value) => sum + value, 0) / values.length,
  min: (values) => Math.min(...values),
  max: (values) => Math.max(...values),
};

interface Bucket {
  column: string;
  format: (value: unknown) => string;
  isMetricNames?: boolean;
}

interface SeriesLayer {
  name: string;
  rankAtDepth: number;
  totalSeriesAtDepth: number;
}

// Converts the panel config to the Lens state the browser renders, as the dashboard does: the
// config is validated (which fills in the defaults) and then transformed by Lens.
const getLensState = (
  config: PartitionPreviewConfig
): {
  visualization: LensPartitionVisualizationState;
  layer: LensPartitionLayerState;
  columns: TextBasedLayerColumn[];
} => {
  const parsed = lensApiConfigSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(`The panel config is not a valid Lens config: ${parsed.error.message}`);
  }
  const { state } = new LensConfigBuilder(undefined, true).fromAPIFormat(parsed.data);
  const visualization = state.visualization as LensPartitionVisualizationState;
  const [layer] = visualization.layers;
  const columns = state.datasourceStates.textBased?.layers[layer.layerId]?.columns ?? [];
  return { visualization, layer, columns };
};

const getLabelFormatter = (
  table: PreviewTable,
  { column, format }: PartitionColumn,
  { timeZone, dateFormat }: PreviewContext
): ((value: unknown) => string) => {
  const type = getColumnType(table, column) ?? 'keyword';
  const formatNumber = getValueFormatter(format);
  return (value) => {
    if (value == null) return NULL_LABEL;
    if (value === '') return EMPTY_LABEL;
    if (DATE_TYPES.has(type)) return moment.tz(Number(value), timeZone).format(dateFormat);
    if (NUMBER_TYPES.has(type) && typeof value === 'number') return formatNumber(value);
    return String(value);
  };
};

// What `lens_collapse` does: sums (or averages, ...) the metrics over the collapsed columns.
const collapseRows = (
  rows: Row[],
  keyColumns: string[],
  metricColumns: string[],
  collapseFn: (values: number[]) => number
): Row[] => {
  const groups = new Map<string, Row[]>();
  rows.forEach((row) => {
    const key = JSON.stringify(keyColumns.map((column) => row[column]));
    groups.set(key, [...(groups.get(key) ?? []), row]);
  });
  return [...groups.values()].map((group) => ({
    ...Object.fromEntries(keyColumns.map((column) => [column, group[0][column]])),
    ...Object.fromEntries(
      metricColumns.map((column) => [
        column,
        collapseFn(group.map((row) => Number(row[column])).filter(Number.isFinite)),
      ])
    ),
  }));
};

// `decreaseOpacity` of the charts plugin (public code): inner layers are mixed toward the
// background.
const decreaseOpacity = (color: string, step: number, totalSteps: number) =>
  totalSteps === 1
    ? color
    : chroma(color)
        .mix(euiThemeVars.euiColorEmptyShade, Math.min(0.2 * (step - 1), 0.8), 'lch')
        .hex()
        .toUpperCase();

const uniqueValues = (rows: Row[], column: string) => [...new Set(rows.map((row) => row[column]))];

// `getCategoricalColor` of the legacy palettes the charts plugin registers, without synced colors.
const getLegacyCategoricalColor = (
  paletteName: string,
  series: SeriesLayer[],
  maxDepth: number
): string | undefined => {
  const palettes = getPreviewPalettes();
  const [{ rankAtDepth, totalSeriesAtDepth }] = series;
  const gradient = GRADIENT_PALETTES[paletteName];
  // The compatibility and custom palettes are approximated with the default one.
  const roundRobinColors = palettes.get(ROUND_ROBIN_PALETTES[paletteName] ?? 'default').colors();
  const color = gradient
    ? palettes.get(gradient).colors(totalSeriesAtDepth)[rankAtDepth]
    : roundRobinColors[rankAtDepth % roundRobinColors.length];
  return color && maxDepth > 1 ? decreaseOpacity(color, series.length, maxDepth) : color;
};

// `createSeriesLayers`: the name, rank and sibling count of the node and each of its parents.
const getSeriesLayers = (node: ArrayNode, colorIndexMap: Map<string, number>): SeriesLayer[] => {
  const layers: SeriesLayer[] = [];
  let current: ArrayNode = node;
  while (current.parent && current.depth > 0) {
    const name = String(current.parent.children[current.sortIndex][0]);
    layers.unshift({
      name,
      rankAtDepth: colorIndexMap.get(name) ?? current.sortIndex,
      totalSeriesAtDepth: current.parent.children.length,
    });
    current = current.parent;
  }
  return layers;
};

// The fill color of each layer: the Lens color mapping when the layer state has one
// (`getPartitionFillColor`), otherwise the legacy palette (`getColor`).
const getFillColors = ({
  shape,
  layer,
  palette,
  buckets,
  rows,
  colorOverrides,
}: {
  shape: PartitionShape;
  layer: LensPartitionLayerState;
  palette: string;
  buckets: Bucket[];
  rows: Row[];
  colorOverrides: Map<string, string>;
}): NodeColorAccessor[] => {
  const isMosaic = shape === 'mosaic';
  const numOfLayers = buckets.length;
  // The mosaic colors its rows: the second layer when it has two.
  const colorBucket = buckets[isMosaic && numOfLayers === 2 ? 1 : 0];
  const categories = colorBucket ? uniqueValues(rows, colorBucket.column) : [];
  const { colorMapping } = layer;

  if (colorMapping && numOfLayers > 0) {
    const getColor = getColorFactory(colorMapping, getPreviewPalettes(), false, {
      type: 'categories',
      categories,
    });
    // The category is the third value of the path: the first two are the small multiple and the
    // root. Lens colors it by its string form.
    return buckets.map((_, layerIndex) => (_key, _sortIndex, node) => {
      const path = node[PATH_KEY];
      if (isMosaic) {
        return numOfLayers === 2 && layerIndex === 0
          ? TRANSPARENT
          : getColor(String(path[numOfLayers === 2 ? 3 : 2].value));
      }
      return decreaseOpacity(getColor(String(path[2].value)), layerIndex + 1, numOfLayers);
    });
  }

  const colorIndexMap = new Map(categories.map((category, index) => [String(category), index]));
  return buckets.map((_, layerIndex) => (_key, _sortIndex, node) => {
    const seriesLayers = getSeriesLayers(node, colorIndexMap);
    const override = seriesLayers.reduce<string | undefined>(
      (color, { name }) => colorOverrides.get(name) ?? color,
      undefined
    );
    if (override) return override;
    if (isMosaic && numOfLayers === 2) {
      if (layerIndex === 0) return NO_COLOR;
      const { name } = seriesLayers[1];
      return (
        getLegacyCategoricalColor(
          palette,
          [
            {
              name,
              rankAtDepth: colorIndexMap.get(name) ?? -1,
              totalSeriesAtDepth: categories.length,
            },
          ],
          1
        ) ?? NO_COLOR
      );
    }
    return getLegacyCategoricalColor(palette, seriesLayers, numOfLayers) ?? NO_COLOR;
  });
};

// `VisualizationNoResults`: the chart icon above "No results found", or the EUI warning icon above
// a message when there are negative values.
const renderEmptySvg = async (
  title: string | undefined,
  shape: PartitionShape,
  hasNegativeValues: boolean
): Promise<string> => {
  if (!hasNegativeValues) {
    return framePreviewSvg(
      title,
      emptyPlaceholderSvg({
        icon: CHART_ICONS[shape],
        width: PREVIEW_WIDTH,
        height: PREVIEW_CHART_HEIGHT,
      })
    );
  }
  // The placeholder layout, with the warning icon where the chart icon would be.
  const placeholder = emptyPlaceholderSvg({
    icon: () => null,
    message: `${shape[0].toUpperCase()}${shape.slice(1)} chart can't render with negative values.`,
    width: PREVIEW_WIDTH,
    height: PREVIEW_CHART_HEIGHT,
  });
  const warningIcon = await euiIconSvg('warning', {
    size: EMPTY_ICON_SIZE,
    color: euiThemeVars.euiColorWarningText,
    x: (PREVIEW_WIDTH - EMPTY_ICON_SIZE) / 2,
    y: (PREVIEW_CHART_HEIGHT - EMPTY_ICON_SIZE - 8 - 16) / 2,
  });
  return framePreviewSvg(title, placeholder.replace(/^(<svg [^>]*>)/, `$1${warningIcon}`));
};

/**
 * Draws a Lens pie, donut, treemap, mosaic or waffle config (ES|QL) with Elastic Charts' headless
 * renderer, from the Lens state the config becomes: layers and their order, palette and color
 * mapping colors, slice labels and values, the legend and the empty states.
 */
const renderPartitionPreviewSvg = async (
  config: PartitionPreviewConfig,
  table: PreviewTable,
  context: PreviewContext
): Promise<string> => {
  const { title } = config;
  const { visualization, layer, columns } = getLensState(config);
  const { shape } = visualization;
  const configColumns = [
    ...(config.metrics ?? []),
    ...(config.metric ? [config.metric] : []),
    ...(config.group_by ?? []),
    ...(config.group_breakdown_by ?? []),
  ];
  const getColumn = (accessor: string): PartitionColumn => {
    const column = columns.find(({ columnId }) => columnId === accessor);
    const name = column?.fieldName ?? accessor;
    return {
      column: name,
      label: column?.customLabel ? column.label : undefined,
      format: configColumns.find((configColumn) => configColumn.column === name)?.format,
    };
  };

  const groupAccessors = [...layer.primaryGroups, ...(layer.secondaryGroups ?? [])];
  const isCollapsed = (accessor: string) => Boolean(layer.collapseFns?.[accessor]);
  const metrics = (layer.allowMultipleMetrics ? layer.metrics : layer.metrics.slice(0, 1)).map(
    getColumn
  );
  if (metrics.length === 0) {
    throw new Error('The panel has no partition chart metric column');
  }
  const metricColumns = metrics.map(({ column }) => column);
  let rows = toRows(table);
  groupAccessors.filter(isCollapsed).forEach((accessor) => {
    rows = collapseRows(
      rows,
      groupAccessors.filter((other) => other !== accessor).map((other) => getColumn(other).column),
      layer.metrics.map((metric) => getColumn(metric).column),
      COLLAPSE_FNS[layer.collapseFns?.[accessor] ?? 'sum'] ?? COLLAPSE_FNS.sum
    );
  });

  // The mosaic flips its buckets so that the breakdown columns come first.
  const activeGroups = groupAccessors.filter((accessor) => !isCollapsed(accessor)).map(getColumn);
  const buckets: Bucket[] = (shape === 'mosaic' ? [...activeGroups].reverse() : activeGroups).map(
    (group) => ({ column: group.column, format: getLabelFormatter(table, group, context) })
  );
  let metricColumn = metricColumns[0];
  const metricLabels = metrics.map(({ column, label }) => label ?? column);
  // Several metrics become one more (last) layer with a slice per metric.
  if (metrics.length > 1) {
    rows = rows.flatMap((row) =>
      metrics.map(({ column }, index) => ({
        ...Object.fromEntries(buckets.map((bucket) => [bucket.column, row[bucket.column]])),
        [METRIC_NAME_COLUMN]: metricLabels[index],
        [VALUE_COLUMN]: row[column],
      }))
    );
    buckets.push({ column: METRIC_NAME_COLUMN, format: String, isMetricNames: true });
    metricColumn = VALUE_COLUMN;
  }

  const metricValues = rows.map((row) => row[metricColumn]);
  const hasNegativeValues = metricValues.some((value) => typeof value === 'number' && value < 0);
  if (rows.length === 0 || hasNegativeValues || metricValues.every((value) => !value)) {
    return renderEmptySvg(title, shape, hasNegativeValues);
  }

  const showLabels = layer.categoryDisplay !== 'hide';
  const showValues = layer.numberDisplay !== 'hidden';
  const isPercent = layer.numberDisplay === 'percent';
  const percentDecimals =
    shape === 'waffle'
      ? DEFAULT_PERCENT_DECIMALS
      : layer.percentDecimals ?? DEFAULT_PERCENT_DECIMALS;
  const formatPercent = getValueFormatter({
    type: 'custom',
    pattern: `0,0.[${'0'.repeat(percentDecimals)}]%`,
  });
  const formatMetric = getValueFormatter(metrics[0].format);

  // Lens shows the legend by default for multi-layer pies and donuts and for waffles.
  const showLegend =
    layer.legendDisplay === 'show' ||
    (layer.legendDisplay === 'default' &&
      (shape === 'waffle' || ((shape === 'pie' || shape === 'donut') && buckets.length > 1)));
  const nestedLegend =
    shape === 'waffle'
      ? false
      : shape === 'treemap' || groupAccessors.length > 1
      ? Boolean(layer.nestedLegend)
      : false;
  const flatLegend = !nestedLegend || shape === 'waffle';
  // Waffles list the slice values unless the panel turns them off (`getLegendStats`).
  const legendValues =
    shape === 'waffle' && (layer.legendStats ?? [LegendValue.Value]).includes(LegendValue.Value)
      ? [LegendValue.Value]
      : [];

  // Pies leave room for outside labels when they have tiny slices.
  const total = metricValues.reduce<number>((sum, value) => sum + (Number(value) || 0), 0);
  const smallSlices = metricValues.filter((value) => Number(value) / total < 0.02).length;
  const rescaleFactor = smallSlices ? 1 / (1 + Math.min(smallSlices * 0.05, 0.2)) : 1;
  const isPieLike = shape !== 'treemap' && shape !== 'mosaic';
  const hideLinks = !showLabels || layer.categoryDisplay === 'inside';
  const partitionTheme: PartialTheme['partition'] = {
    outerSizeRatio: isPieLike ? rescaleFactor : 1,
    minFontSize: 10,
    maxFontSize: 16,
    emptySizeRatio:
      shape === 'donut' ? layer.emptySizeRatio ?? PARTITION_EMPTY_SIZE_RADIUS.SMALL : 0,
    sectorLineWidth: 1.5,
    circlePadding: 4,
    linkLabel:
      isPieLike && hideLinks
        ? { maxCount: 0, ...(!showLabels ? { maximumSection: Number.POSITIVE_INFINITY } : {}) }
        : { maxCount: 5 },
    ...(!isPieLike && !showLabels ? { fillLabel: { textColor: TRANSPARENT } } : {}),
  };

  // Static metric colors apply to the slices of several metrics without other breakdowns.
  const colorOverrides = new Map(
    layer.allowMultipleMetrics && activeGroups.length === 0
      ? layer.metrics.flatMap((accessor, index) => {
          const color = layer.colorsByDimension?.[accessor];
          return color && metricLabels[index] ? [[metricLabels[index], color] as const] : [];
        })
      : []
  );
  const fillColors = getFillColors({
    shape,
    layer,
    palette: visualization.palette?.name ?? 'default',
    buckets,
    rows,
    colorOverrides,
  });

  const mosaicSortingMap = new Map(
    buckets[0] ? uniqueValues(rows, buckets[0].column).map((value, index) => [value, index]) : []
  );
  const getSortPredicate = (
    bucket: Bucket
  ): ((a: ArrayEntry, b: ArrayEntry) => number) | undefined => {
    if (bucket.isMetricNames) {
      return ([, node1], [, node2]) =>
        (node1.inputIndex?.[0] ?? 0) - (node2.inputIndex?.[0] ?? 0) || node2.value - node1.value;
    }
    if (shape === 'waffle') return ([, node1], [, node2]) => node2.value - node1.value;
    if (shape === 'mosaic') {
      return ([name1, node1], [name2, node2]) =>
        buckets.length === 1 ||
        (node1.children.length &&
          mosaicSortingMap.has(name1) &&
          node2.children.length &&
          mosaicSortingMap.has(name2))
          ? (mosaicSortingMap.get(name1) ?? 0) - (mosaicSortingMap.get(name2) ?? 0)
          : node2.value - node1.value;
    }
    return undefined;
  };

  const layers: PartitionLayer[] = buckets.map((bucket, layerIndex) => ({
    groupByRollup: (row: Datum) => row[bucket.column],
    showAccessor: () => true,
    nodeLabel: (value: unknown) => bucket.format(value),
    fillLabel: {
      valueFont: { fontWeight: 700 },
      ...(!showValues ? { valueFormatter: () => '' } : {}),
      ...(shape === 'mosaic' && layerIndex === 0
        ? { minFontSize: 14, maxFontSize: 14, clipText: true }
        : {}),
    },
    sortPredicate: getSortPredicate(bucket),
    shape: { fillColor: fillColors[layerIndex] },
  }));
  // A partition chart without buckets is a single slice of the whole metric.
  if (layers.length === 0) {
    layers.push({
      groupByRollup: () => metricLabels[0],
      shape: {
        fillColor:
          getLegacyCategoricalColor(
            visualization.palette?.name ?? 'default',
            [{ name: metricLabels[0], rankAtDepth: 0, totalSeriesAtDepth: 1 }],
            1
          ) ?? NO_COLOR,
      },
    });
  }

  // A flat legend lists the first layer's categories in the order the rows have them.
  const firstBucket = buckets[0];
  const legendOrder = new Map(
    firstBucket ? uniqueValues(rows, firstBucket.column).map((value, index) => [value, index]) : []
  );
  const legendSort =
    showLegend && flatLegend && firstBucket
      ? (a: SeriesIdentifier, b: SeriesIdentifier) =>
          a.key == null
            ? 1
            : b.key == null
            ? -1
            : (legendOrder.get(a.key) ?? 0) - (legendOrder.get(b.key) ?? 0)
      : undefined;

  return renderChartPreviewSvg(
    title,
    <>
      <Settings
        showLegend={showLegend}
        legendPosition={layer.legendPosition ?? Position.Right}
        legendSize={LEGEND_SIZES[layer.legendSize ?? 'auto']}
        legendMaxDepth={nestedLegend ? undefined : 1}
        flatLegend={flatLegend}
        legendSort={legendSort}
        legendValues={legendValues}
        theme={{
          partition: partitionTheme,
          chartMargins: { top: 0, bottom: 0, left: 0, right: 0 },
          // Lens truncates legend labels to one line unless the panel says otherwise.
          legend: {
            labelOptions: {
              maxLines: layer.truncateLegend ?? true ? layer.legendMaxLines ?? 1 : 0,
            },
          },
        }}
      />
      <Partition
        id={shape}
        data={rows}
        layout={LAYOUTS[shape]}
        specialFirstInnermostSector={shape === 'pie' || shape === 'donut' ? true : undefined}
        valueAccessor={(row: Datum) => {
          const value = row[metricColumn];
          return Number.isFinite(value) && value >= 0 ? value : 0;
        }}
        percentFormatter={(value: number) => formatPercent(value / 100)}
        valueGetter={showLabels && showValues && isPercent ? 'percent' : undefined}
        valueFormatter={(value: number) => (showLabels && showValues ? formatMetric(value) : '')}
        layers={layers}
        topGroove={showLabels ? undefined : 0}
      />
    </>
  );
};

export const partitionPreviewRenderer: PanelPreviewRenderer<PartitionPreviewConfig> = {
  getQuery: getDataSourceQuery,
  renderSvg: renderPartitionPreviewSvg,
};
