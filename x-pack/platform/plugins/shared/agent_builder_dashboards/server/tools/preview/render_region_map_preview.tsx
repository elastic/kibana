/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import chroma from 'chroma-js';
import type { Feature, Geometry } from 'geojson';
import { KbnPalette } from '@kbn/palettes';
import { framePreviewSvg, PREVIEW_CHART_HEIGHT, PREVIEW_WIDTH } from './preview_frame';
import { measurePreviewText, previewTextSvg } from './preview_font';
import { getPreviewPalettes } from './preview_palettes';
import { getDataSourceQuery, toRows } from './preview_table';
import {
  EMS_WORLD_JOIN_FIELD,
  EMS_WORLD_LAYER_ID,
  getEmsFeatures,
  getEmsFileLayers,
  suggestEmsJoin,
} from './render_region_map_ems';
import {
  createGlobeProjector,
  fitGlobeView,
  getGeometryBounds,
  type GlobeProjector,
} from './render_region_map_globe';
import type { PanelPreviewRenderer, PreviewContext, PreviewTable } from './types';

interface RegionMapPreviewConfig {
  type: string;
  title?: string;
  data_source?: { type?: string; query?: string };
  metric: { column: string; label?: string };
  region: { column: string; label?: string; ems?: { boundaries: string; join: string } };
}

interface JoinedFeature {
  geometry: Geometry;
  value: number;
}

interface LegendBreak {
  color: string;
  label: string;
}

// The choropleth layer Lens hands to the maps plugin (`choropleth_chart.tsx`): an ordinal
// "Blue to Red" (`euiPaletteForTemperature(8)`) fill, a static #3d3d3d 1px outline, and the
// default layer alpha of 0.75.
const FILL_STEPS = 8;
const LINE_COLOR = '#3d3d3d';
const LAYER_ALPHA = 0.75;
// The `road_map_desaturated_v9` (Borealis light) EMS basemap: white land, `water` and
// `water-offset` fills, and `boundary-land-level-2` lines.
const BASEMAP_LAND_COLOR = '#ffffff';
const BASEMAP_WATER_COLOR = 'rgb(232,241,255)';
const BASEMAP_WATER_OFFSET_COLOR = 'rgb(191,219,255)';
const BASEMAP_BOUNDARY_COLOR = 'rgb(194,205,230)';
const BASEMAP_BOUNDARY_WIDTHS: ReadonlyArray<[number, number]> = [
  [0, 0.6],
  [4, 1.4],
  [5, 2],
  [12, 6],
];
const OTHER_BUCKET_KEY = '__other__';
const TEXT_COLOR = '#1d2a3e';
const SUBDUED_TEXT_COLOR = '#516381';
const PANEL_BORDER_COLOR = '#e3e8f2';
const LAYER_NAME_FONT = '400 14px Inter';
const LEGEND_TITLE_FONT = '700 11px Inter';
const LEGEND_LABEL_FONT = '400 12px Inter';
const MAX_LAYER_NAME_WIDTH = 240;

// Stepwise linear interpolation over zoom, like a MapLibre `stops` function with base 1.
const interpolateStops = (stops: ReadonlyArray<[number, number]>, zoom: number): number => {
  const next = stops.findIndex(([stop]) => stop >= zoom);
  if (next <= 0) {
    return next === 0 ? stops[0][1] : stops[stops.length - 1][1];
  }
  const [fromZoom, from] = stops[next - 1];
  const [toZoom, to] = stops[next];
  return from + ((to - from) * (zoom - fromZoom)) / (toZoom - fromZoom);
};

// The maps plugin's `dynamicRound`: legend values keep two significant decimals below 10.
const dynamicRound = (value: number): number => {
  let precision = 0;
  let threshold = 10;
  while (value < threshold && precision < 8) {
    precision++;
    threshold = threshold / 10;
  }
  return precision === 0 ? Math.round(value) : parseFloat(value.toFixed(precision + 1));
};

/**
 * The fill of a value and the legend breaks, as the maps plugin's `DynamicColorProperty` builds
 * them from the range of the joined values: eight stops from min to max (the last one at 7/8),
 * interpolated linearly, and transparent for missing values.
 */
const getColorScale = (
  values: readonly number[]
): { getColor: (value: number) => string | undefined; breaks: LegendBreak[] } => {
  const palette = getPreviewPalettes().get(KbnPalette.Temperature).colors(FILL_STEPS);
  const finite = values.filter(Number.isFinite);
  if (!finite.length) {
    return { getColor: () => undefined, breaks: [] };
  }
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const lastColor = palette[palette.length - 1];
  if (min === max) {
    return {
      getColor: (value) => (Number.isFinite(value) ? lastColor : undefined),
      breaks: [{ color: lastColor, label: String(dynamicRound(max)) }],
    };
  }
  const stops = palette.map((color, index) => ({
    value: min + ((max - min) * index) / palette.length,
    color,
  }));
  const getColor = (value: number): string | undefined => {
    if (!Number.isFinite(value)) {
      return undefined;
    }
    const clamped = Math.min(max, Math.max(min, value));
    const next = stops.findIndex((stop) => stop.value > clamped);
    if (next === -1) {
      return lastColor;
    }
    const from = stops[next - 1];
    const to = stops[next];
    // MapLibre's `interpolate` expression blends colors in RGB.
    return chroma
      .mix(from.color, to.color, (clamped - from.value) / (to.value - from.value), 'rgb')
      .hex();
  };
  const format = (value: number): string => String(dynamicRound(value));
  const breaks = stops.map(({ value, color }, index) => {
    const nextStop = stops[index + 1];
    if (!nextStop) {
      return { color, label: `>= ${format(value)}` };
    }
    return {
      color,
      label:
        index === 0
          ? `< ${format(nextStop.value)}`
          : `${format(value)} up to ${format(nextStop.value)}`,
    };
  });
  return { getColor, breaks };
};

const truncateText = (text: string, font: string, maxWidth: number): string => {
  if (measurePreviewText(text, font) <= maxWidth) {
    return text;
  }
  let end = text.length;
  while (end > 1 && measurePreviewText(`${text.slice(0, end)}…`, font) > maxWidth) {
    end--;
  }
  return `${text.slice(0, end)}…`;
};

// The maps `PolygonIcon`: a 16px rounded square.
const polygonIconSvg = (x: number, y: number, fill: string, stroke: string): string =>
  `<rect x="${x + 0.5}" y="${
    y + 0.5
  }" width="15" height="15" rx="4" fill="${fill}" stroke="${stroke}"/>`;

/**
 * The layer's entry of the maps layer panel with its legend details: the layer name ("World
 * Countries by Count"), the metric label and one row per color break.
 */
const renderLegendSvg = (
  layerName: string,
  metricLabel: string,
  breaks: readonly LegendBreak[],
  iconColor: string
): string => {
  const padding = 8;
  const rowHeight = 18;
  const name = truncateText(layerName, LAYER_NAME_FONT, MAX_LAYER_NAME_WIDTH);
  const emptyMessage = 'No matching results found in term joins';
  const textWidths = [
    24 + measurePreviewText(name, LAYER_NAME_FONT),
    24 + measurePreviewText(metricLabel, LEGEND_TITLE_FONT),
    ...breaks.map(({ label }) => 48 + measurePreviewText(label, LEGEND_LABEL_FONT)),
    ...(breaks.length ? [] : [24 + measurePreviewText(emptyMessage, LEGEND_LABEL_FONT)]),
  ];
  const width = Math.ceil(Math.max(...textWidths)) + 2 * padding;
  const detailRows = breaks.length ? breaks.length + 1 : 1;
  const height = padding * 2 + 22 + detailRows * rowHeight;
  const x = PREVIEW_WIDTH - 12 - width;
  const y = 12;
  const left = x + padding;
  const parts = [
    `<rect x="${x + 0.5}" y="${y + 0.5}" width="${width - 1}" height="${
      height - 1
    }" rx="6" fill="#fff" stroke="${PANEL_BORDER_COLOR}"/>`,
    polygonIconSvg(left, y + padding + 2, iconColor, LINE_COLOR),
    previewTextSvg(name, {
      font: LAYER_NAME_FONT,
      x: left + 24,
      y: y + padding + 15,
      fill: TEXT_COLOR,
    }),
  ];
  let rowY = y + padding + 22;
  if (!breaks.length) {
    parts.push(
      previewTextSvg(emptyMessage, {
        font: LEGEND_LABEL_FONT,
        x: left + 24,
        y: rowY + 13,
        fill: SUBDUED_TEXT_COLOR,
      })
    );
    return parts.join('');
  }
  parts.push(
    previewTextSvg(metricLabel, {
      font: LEGEND_TITLE_FONT,
      x: left + 24,
      y: rowY + 13,
      fill: TEXT_COLOR,
    })
  );
  breaks.forEach(({ color, label }) => {
    rowY += rowHeight;
    parts.push(
      polygonIconSvg(left + 24, rowY + 1, color, color),
      previewTextSvg(label, {
        font: LEGEND_LABEL_FONT,
        x: left + 48,
        y: rowY + 13,
        fill: TEXT_COLOR,
      })
    );
  });
  return parts.join('');
};

// The EMS basemap under the choropleth: water on the globe, white land with the coastline
// shadow MapLibre draws from `water-offset` up to zoom 8, and country boundaries.
const renderBasemapSvg = (projector: GlobeProjector, land: readonly Feature[]): string => {
  const { view, outlineRadius } = projector;
  const parts = [
    `<circle cx="${view.width / 2}" cy="${view.height / 2}" r="${outlineRadius.toFixed(
      1
    )}" fill="${BASEMAP_WATER_COLOR}"/>`,
  ];
  const landPaths = land.map(({ geometry }) => projector.polygonPaths(geometry));
  const landPath = landPaths.map(({ fill }) => fill).join('');
  const boundaryPath = landPaths.map(({ stroke }) => stroke).join('');
  if (!landPath) {
    return parts.join('');
  }
  const offset = view.zoom >= 8 ? 0 : view.zoom <= 6 ? 2 : 8 - view.zoom;
  const boundaryWidth = interpolateStops(BASEMAP_BOUNDARY_WIDTHS, view.zoom);
  parts.push(
    `<clipPath id="region-map-land"><path d="${landPath}" clip-rule="evenodd"/></clipPath>`,
    `<path d="${landPath}" fill="${
      offset ? BASEMAP_WATER_OFFSET_COLOR : BASEMAP_LAND_COLOR
    }" fill-rule="evenodd"/>`
  );
  if (offset) {
    parts.push(
      `<g clip-path="url(#region-map-land)"><path d="${landPath}" transform="translate(${offset} 0)" fill="${BASEMAP_LAND_COLOR}" fill-rule="evenodd"/></g>`
    );
  }
  parts.push(
    `<path d="${boundaryPath}" fill="none" stroke="${BASEMAP_BOUNDARY_COLOR}" stroke-width="${boundaryWidth.toFixed(
      2
    )}" stroke-linejoin="round"/>`
  );
  return parts.join('');
};

const renderRegionMapPreviewSvg = async (
  config: RegionMapPreviewConfig,
  table: PreviewTable,
  context: PreviewContext
): Promise<string> => {
  const { metric, region } = config;
  for (const { column } of [metric, region]) {
    if (!table.columns.some(({ name }) => name === column)) {
      throw new Error(`The query result has no "${column}" column`);
    }
  }
  const rows = toRows(table);
  const fileLayers = await getEmsFileLayers(context.ems);

  // Lens joins to the configured EMS layer, else to the one whose ids contain every region key.
  const regionKeys = [
    ...new Set(
      rows
        .map((row) => row[region.column])
        .filter((key) => key && key !== OTHER_BUCKET_KEY)
        .map(String)
    ),
  ];
  const suggestion = region.ems ? undefined : suggestEmsJoin(fileLayers, regionKeys);
  const layerId = region.ems?.boundaries ?? suggestion?.layerId ?? EMS_WORLD_LAYER_ID;
  const joinField = region.ems?.join ?? suggestion?.field ?? EMS_WORLD_JOIN_FIELD;
  const fileLayer = fileLayers.find((layer) => layer.getId() === layerId);
  if (!fileLayer) {
    throw new Error(`Elastic Maps Service has no "${layerId}" boundaries`);
  }
  const worldLayer = fileLayers.find((layer) => layer.getId() === EMS_WORLD_LAYER_ID);
  const [features, land] = await Promise.all([
    getEmsFeatures(fileLayer),
    worldLayer ? getEmsFeatures(worldLayer) : Promise.resolve([]),
  ]);

  // The maps `TableSource` inner join: the first row of each region key wins, and features
  // without a row are hidden.
  const valuesByKey = new Map<string, unknown>();
  rows.forEach((row) => {
    const key = row[region.column];
    if (key && !valuesByKey.has(String(key))) {
      valuesByKey.set(String(key), row[metric.column]);
    }
  });
  const joined: JoinedFeature[] = features.flatMap(({ geometry, properties }) => {
    const key = properties?.[joinField];
    if (key === undefined || key === null || !valuesByKey.has(String(key))) {
      return [];
    }
    return [{ geometry, value: parseFloat(String(valuesByKey.get(String(key)))) }];
  });

  const { getColor, breaks } = getColorScale(joined.map(({ value }) => value));
  const view = fitGlobeView(
    getGeometryBounds(joined.map(({ geometry }) => geometry)),
    PREVIEW_WIDTH,
    PREVIEW_CHART_HEIGHT
  );
  const projector = createGlobeProjector(view);
  const choropleth = joined.map(({ geometry, value }) => {
    const { fill, stroke } = projector.polygonPaths(geometry);
    const color = getColor(value);
    return [
      fill && color
        ? `<path d="${fill}" fill="${color}" fill-opacity="${LAYER_ALPHA}" fill-rule="evenodd"/>`
        : '',
      stroke
        ? `<path d="${stroke}" fill="none" stroke="${LINE_COLOR}" stroke-opacity="${LAYER_ALPHA}" stroke-width="1" stroke-linejoin="round"/>`
        : '',
    ].join('');
  });

  const metricLabel = metric.label ?? metric.column;
  const palette = getPreviewPalettes().get(KbnPalette.Temperature).colors(FILL_STEPS);
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PREVIEW_WIDTH}" height="${PREVIEW_CHART_HEIGHT}" viewBox="0 0 ${PREVIEW_WIDTH} ${PREVIEW_CHART_HEIGHT}">`,
    renderBasemapSvg(projector, land),
    ...choropleth,
    renderLegendSvg(
      `${fileLayer.getDisplayName()} by ${metricLabel}`,
      metricLabel,
      joined.length ? breaks : [],
      palette[Math.floor(palette.length / 2)]
    ),
    '</svg>',
  ].join('');
  return framePreviewSvg(config.title, svg);
};

/**
 * Region map previews: EMS boundaries joined to the ES|QL result on the region key, colored by
 * the metric and drawn on the globe the way the maps plugin shows Lens choropleths.
 */
export const regionMapPreviewRenderer: PanelPreviewRenderer<RegionMapPreviewConfig> = {
  getQuery: getDataSourceQuery,
  renderSvg: renderRegionMapPreviewSvg,
};
