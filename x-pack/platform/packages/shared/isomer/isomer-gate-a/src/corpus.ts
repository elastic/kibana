/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import type { DebugState } from '@elastic/charts';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { normalizeDebugState } from './debug_state';
import { normalizeMetricReadings } from './metric_dom';
import type { NormalizedChart } from './model';
import type { DataGridReading, LegacyMetricTileReading } from './records';
import {
  normalizeDataGridReading,
  normalizeLegacyMetricReadings,
  normalizeWordReadings,
} from './records';

/** Where the gate's cases live: one file per corpus panel. */
export const GATE_FIXTURES_DIR = Path.resolve(__dirname, '../fixtures');

export const THEMES = ['light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

/** A metric tile as Kibana's page showed it. */
export interface MetricReading {
  backgroundColor: string;
  texts: Array<{ text: string; className: string; color: string }>;
}

/** The context a panel was captured in. */
export interface CaptureContext {
  now: string;
  time_range: { absolute: { from: string; to: string } };
  ui_settings: Record<string, unknown>;
}

/**
 * What Kibana drew in one color mode: Elastic Charts' `DebugState`, or what the page shows where
 * a chart reports none: the metric's DOM, the data grid, the legacy metric's tiles, or the SVG
 * words of a tag cloud.
 */
export interface CaptureRendering {
  debugState?: DebugState;
  metrics?: MetricReading[];
  dataGrids?: DataGridReading[];
  legacyMetrics?: LegacyMetricTileReading[];
  svgTexts?: Array<{ text: string; fill: string; fontSize?: string }>;
}

/**
 * One corpus panel, as much of a capture as Gate A reads: the as-code config, the render
 * context, Kibana's inspector tables, the chart size, and what Kibana drew in each mode.
 */
export interface GateFixture {
  dashboard: string;
  panel: string;
  /** The Lens API chart type: `metric`, `xy`, `data_table`, `pie`, `heatmap`, and so on. */
  chart_type: string;
  config: Record<string, unknown>;
  context: CaptureContext;
  tables: Datatable[];
  size: { width: number; height: number };
  light: CaptureRendering;
  dark: CaptureRendering;
}

/** A gated case: a Lens panel in one color mode. */
export interface GateCase {
  /** `dashboard/panel/theme`, unique and stable. */
  name: string;
  config: Record<string, unknown>;
  theme: Theme;
  fixture: GateFixture;
}

/** Every case in the gate's fixtures, each panel in light and dark, sorted by name. */
export const listGateCases = (fixturesDir: string = GATE_FIXTURES_DIR): GateCase[] =>
  Fs.readdirSync(fixturesDir)
    .filter((file) => file.endsWith('.json'))
    .flatMap((file) => {
      const fixture = JSON.parse(
        Fs.readFileSync(Path.join(fixturesDir, file), 'utf8')
      ) as GateFixture;
      return THEMES.map((theme) => ({
        name: `${fixture.dashboard}/${fixture.panel}/${theme}`,
        config: fixture.config,
        theme,
        fixture,
      }));
    })
    .sort((a, b) => a.name.localeCompare(b.name));

/**
 * Kibana's own tables for a case, in layer order, with columns keyed by their ES|QL names as the
 * ES|QL search returns them (Lens re-keys them by its own column ids).
 */
export const kibanaTables = ({ fixture }: GateCase): Datatable[] =>
  fixture.tables.map((table) => {
    const ids = new Map(
      table.columns.map((column) => [
        column.id,
        String(column.meta.sourceParams?.sourceField ?? column.name),
      ])
    );
    return {
      ...table,
      columns: table.columns.map((column) => ({ ...column, id: ids.get(column.id) ?? column.id })),
      rows: table.rows.map((row) =>
        Object.fromEntries(Object.entries(row).map(([id, value]) => [ids.get(id) ?? id, value]))
      ),
    };
  });

/** What Kibana drew for a case: its page readings, or its chart's `DebugState`. */
export const kibanaChart = ({ fixture, theme }: GateCase): NormalizedChart => {
  const { debugState, metrics, dataGrids, legacyMetrics, svgTexts } = fixture[theme];
  if (fixture.chart_type === 'metric' && metrics) {
    return normalizeMetricReadings(metrics);
  }
  if (dataGrids?.length) {
    return normalizeDataGridReading(dataGrids[0]);
  }
  if (legacyMetrics?.length) {
    return normalizeLegacyMetricReadings(legacyMetrics);
  }
  if (!debugState && svgTexts?.length) {
    return normalizeWordReadings(svgTexts);
  }
  if (!debugState) {
    throw new Error(`${fixture.dashboard}/${fixture.panel} has no DebugState.`);
  }
  return normalizeDebugState(debugState, undefined, { waffle: fixture.chart_type === 'waffle' });
};

/** The size Kibana drew a case's chart at. */
export const kibanaChartSize = ({ fixture }: GateCase): { width: number; height: number } =>
  fixture.size;
