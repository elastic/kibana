/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DebugState } from '@elastic/charts';
import type {
  GaugeScene,
  HeatmapScene,
  LegacyMetricScene,
  PartitionScene,
  TableScene,
  TagCloudScene,
} from '@kbn/isomer';
import { normalizeColor } from './colors';
import type { NormalizedRecord, NormalizedRecords } from './model';

type PartitionNode = PartitionScene['nodes'][number];
type HeatmapDebugState = NonNullable<DebugState['heatmap']>;
type BulletDebugState = NonNullable<DebugState['bullet']>;
type PartitionDebugState = NonNullable<DebugState['partition']>[number];

/** Kibana's label for a missing value, which `DebugState` reports as a `null` name. */
const NULL_NAME = '(null)';

const byFields =
  (...fields: string[]) =>
  (a: NormalizedRecord, b: NormalizedRecord) => {
    for (const field of fields) {
      const order = String(a[field]).localeCompare(String(b[field]), 'en', { numeric: true });
      if (order !== 0) {
        return order;
      }
    }
    return 0;
  };

const legendOf = (state: DebugState): NormalizedRecord[] | undefined =>
  state.legend?.items.map(({ name, color }) => ({ name, color: normalizeColor(color) }));

const withLegend = (
  lists: Record<string, NormalizedRecord[]>,
  legend: NormalizedRecord[] | undefined
): Record<string, NormalizedRecord[]> => (legend ? { ...lists, legend } : lists);

// Slices sort by depth, name, value and color: engines report them in their own draw order.
const sortSlices = byFields('depth', 'name', 'value', 'color');

/**
 * The value an Isomer engine's slice key names: its last part, in the charts pack's documented
 * key encoding, where `\null` is a missing value. Kibana's slices are named by the value itself.
 */
const keyValue = (key: string): string => {
  const parts = key.split(/(?<!\\):/);
  const last = parts[parts.length - 1];
  return last === '\\null' ? NULL_NAME : last.replace(/\\([\\:])/g, '$1');
};

/**
 * A partition chart's slices from Elastic Charts' `DebugState`. A `waffle` reports a slice per
 * square; each slice is listed once. With `keyed`, names are an Isomer engine's slice keys.
 */
export const normalizePartitionDebugState = (
  state: DebugState,
  { keyed = false, waffle = false }: { keyed?: boolean; waffle?: boolean } = {}
): NormalizedRecords => {
  const [first] = (state.partition ?? []) as PartitionDebugState[];
  const seen = new Set<string>();
  const slices = (first?.partitions ?? []).flatMap(({ name, depth, value, color }) => {
    const sliceName = name === null ? NULL_NAME : keyed ? keyValue(String(name)) : String(name);
    const id = JSON.stringify([depth, sliceName, value]);
    if (waffle && seen.has(id)) {
      return [];
    }
    seen.add(id);
    return [{ name: sliceName, depth, value, color: normalizeColor(color) }];
  });
  return {
    kind: 'partition',
    lists: withLegend({ slice: slices.sort(sortSlices) }, legendOf(state)),
  };
};

/** A partition Scene's slices, and its legend when it shows one. */
export const normalizePartitionScene = (scene: PartitionScene): NormalizedRecords => {
  const slices: NormalizedRecord[] = [];
  const visit = (node: PartitionNode) => {
    slices.push({
      name: node.label,
      depth: node.depth,
      value: node.value,
      color: normalizeColor(node.color),
    });
    node.children.forEach(visit);
  };
  scene.nodes.forEach(visit);
  return {
    kind: 'partition',
    lists: withLegend(
      { slice: slices.sort(sortSlices) },
      scene.legend.visible
        ? scene.legend.items.map(({ label, color }) => ({
            name: label,
            color: normalizeColor(color),
          }))
        : undefined
    ),
  };
};

const sortCells = byFields('x', 'y');

/**
 * A heat map's cells (by their x and y cells) and legend, from Elastic Charts' `DebugState`. An
 * Isomer engine places cells by position along each axis; given its Scene, they're its cells.
 */
export const normalizeHeatmapDebugState = (
  state: DebugState,
  scene?: HeatmapScene
): NormalizedRecords => {
  const heatmap = state.heatmap as HeatmapDebugState;
  const at = (axis: HeatmapScene['x'] | undefined, value: string | number) =>
    axis && typeof value === 'number' && axis.scale !== 'time'
      ? axis.categories[value]?.label ?? value
      : value;
  return {
    kind: 'heatmap',
    lists: withLegend(
      {
        cell: heatmap.cells
          .map(({ datum, value, fill }) => {
            const { x, y } = datum as { x: string | number; y: string | number };
            return {
              x: at(scene?.x, x),
              y: y === null ? NULL_NAME : at(scene?.y, y),
              value,
              color: normalizeColor(fill),
            };
          })
          .sort(sortCells),
      },
      legendOf(state)
    ),
  };
};

/** A heat map Scene's cells and band legend. */
export const normalizeHeatmapScene = (scene: HeatmapScene): NormalizedRecords => ({
  kind: 'heatmap',
  lists: withLegend(
    {
      cell: scene.cells
        .map((cell) => {
          const x = scene.x.categories[cell.x];
          return {
            x: scene.x.scale === 'time' ? x?.x ?? null : x?.label ?? null,
            y: scene.y.categories[cell.y]?.label ?? null,
            value: cell.value,
            color: normalizeColor(cell.color),
          };
        })
        .sort(sortCells),
    },
    scene.legend.visible
      ? scene.bands.map(({ label, color }) => ({ name: label, color: normalizeColor(color) }))
      : undefined
  ),
});

/** A gauge from Elastic Charts' `DebugState` of the `Bullet` Kibana draws it with. */
export const normalizeBulletDebugState = (state: DebugState): NormalizedRecords => {
  const row = (state.bullet as BulletDebugState).rows[0]?.[0];
  const domain = (row?.domain ?? []) as number[];
  return {
    kind: 'gauge',
    lists: {
      gauge: row
        ? [
            {
              value: row.value,
              target: row.target ?? null,
              title: row.title,
              subtitle: row.subtitle ?? null,
              min: domain[0] ?? null,
              max: domain[domain.length - 1] ?? null,
            },
          ]
        : [],
      band: (row?.colorBands ?? []).map((color) => ({ color: normalizeColor(color) })),
      tick: (row?.ticks ?? []).map((value) => ({ value })),
    },
  };
};

/** A gauge Scene, as its `Bullet` would report it. */
export const normalizeGaugeScene = (scene: GaugeScene): NormalizedRecords => ({
  kind: 'gauge',
  lists: {
    gauge: [
      {
        value: scene.value ?? null,
        target: scene.goal?.value ?? null,
        title: scene.labels.major,
        subtitle: scene.labels.minor ?? null,
        min: scene.min,
        max: scene.max,
      },
    ],
    band: scene.bands.map(({ color }) => ({ color: normalizeColor(color) })),
    ...(scene.ticks ? { tick: scene.ticks.map((value) => ({ value })) } : {}),
  },
});

const sortWords = byFields('text');

/** A tag cloud's words, from the SVG texts its `Wordcloud` draws, by text, leaving out `exclude`. */
export const normalizeWordReadings = (
  texts: Array<{ text: string; fill: string }>,
  exclude: string[] = []
): NormalizedRecords => ({
  kind: 'tagCloud',
  lists: {
    word: texts
      .filter(({ text }) => text !== '' && !exclude.includes(text))
      .map(({ text, fill }) => ({ text, color: normalizeColor(fill) }))
      .sort(sortWords),
  },
});

/** A tag cloud Scene's words, by text. */
export const normalizeTagCloudScene = (scene: TagCloudScene): NormalizedRecords => ({
  kind: 'tagCloud',
  lists: {
    word: scene.words
      .map(({ text, color }) => ({ text, color: normalizeColor(color) }))
      .sort(sortWords),
  },
});

/** What Kibana's data grid shows for a table, as the corpus reads it. */
export interface DataGridReading {
  headers: Array<{ text: string }>;
  cells: Array<{
    row: number;
    column: number;
    text: string;
    color: string;
    backgroundColor: string;
  }>;
}

// EUI's data grid adds hidden markers for screen readers and copying.
const gridText = (text: string) => text.replace(/[\u21a6\u21b5]/g, '').trim();

const TRANSPARENT = '#00000000';

/** A table's headers and cells from Kibana's data grid: the rows the page shows, in order. */
export const normalizeDataGridReading = ({
  headers,
  cells,
}: DataGridReading): NormalizedRecords => ({
  kind: 'table',
  lists: {
    header: headers.map(({ text }) => ({ text: gridText(text) })),
    cell: cells
      .map(({ row, column, text, color, backgroundColor }) => ({
        row,
        column,
        text: gridText(text),
        color: normalizeColor(color),
        background: normalizeColor(backgroundColor),
      }))
      .sort(byFields('row', 'column')),
  },
});

/** A table Scene's headers and the cells of its first page, in the order it shows them. */
export const normalizeTableScene = (scene: TableScene): NormalizedRecords => {
  const shown = scene.order.slice(0, scene.paging?.pageSize ?? scene.order.length);
  return {
    kind: 'table',
    lists: {
      header: scene.columns.map(({ label }) => ({ text: label })),
      cell: shown.flatMap((position, row) =>
        scene.rows[position].cells.map((cell, column) => ({
          row,
          column,
          text: cell.text,
          color: normalizeColor(cell.color),
          background: cell.background ? normalizeColor(cell.background) : TRANSPARENT,
        }))
      ),
    },
  };
};

/** What Kibana's legacy metric shows for a tile, as the corpus reads it. */
export interface LegacyMetricTileReading {
  value: { text: string; color: string } | null;
  label: { text: string; color: string } | null;
  backgroundColor: string;
}

/** A legacy metric's tiles from Kibana's page. */
export const normalizeLegacyMetricReadings = (
  tiles: LegacyMetricTileReading[]
): NormalizedRecords => ({
  kind: 'legacyMetric',
  lists: {
    tile: tiles.map(({ value, label, backgroundColor }) => ({
      label: label?.text ?? null,
      value: value?.text ?? null,
      color: value ? normalizeColor(value.color) : null,
      background: normalizeColor(backgroundColor || TRANSPARENT),
    })),
  },
});

/** A legacy metric Scene's tiles; a lone tile's background is the chart's. */
export const normalizeLegacyMetricScene = (scene: LegacyMetricScene): NormalizedRecords => ({
  kind: 'legacyMetric',
  lists: {
    tile: scene.tiles.map((tile) => ({
      label: tile.label,
      value: tile.value.text,
      color: normalizeColor(tile.value.color),
      background: normalizeColor(
        tile.background ?? (scene.tiles.length === 1 ? scene.background : TRANSPARENT)
      ),
    })),
  },
});
