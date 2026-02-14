/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardState } from '@kbn/dashboard-plugin/common';
import type {
  RawDashboard,
  DashboardPanel as RawDashboardPanel,
  ColumnMetadata,
} from '@kbn/streams-schema';
import type { DashboardPanel } from '@kbn/dashboard-plugin/server';
import type { LensApiSchemaType } from '@kbn/lens-embeddable-utils/config_builder';
import { LensConfigBuilder, type LensAttributes } from '@kbn/lens-embeddable-utils/config_builder';

const DASHBOARD_GRID_COLUMN_COUNT = 48;
const DEFAULT_PANEL_HEIGHT = 15;

type LensSeriesType = 'line' | 'bar_stacked' | 'area_stacked';

/**
 * ES|QL column reference for Lens API format.
 * Requires operation: 'value' for ESQL columns.
 */
interface EsqlColumnRef {
  operation: 'value';
  column: string;
  label?: string;
}

/**
 * Builds an ES|QL column reference for Lens API.
 * ESQL columns require operation: 'value' to indicate a direct column reference.
 */
function buildEsqlColumnRef(
  columnName: string,
  metadata?: ColumnMetadata[],
  label?: string
): EsqlColumnRef {
  const meta = metadata?.find((m) => m.columnId === columnName);
  return {
    operation: 'value',
    column: columnName,
    label: label ?? meta?.label,
  };
}

/**
 * Converts a raw XY chart panel (line/area/bar) to Lens API format.
 */
function convertXYPanelToLensApi(
  panel: RawDashboardPanel,
  seriesType: LensSeriesType
): LensApiSchemaType {
  const { query, dimensions, columnMetadata, title } = panel;
  const xColumn = dimensions.x;
  const yColumn = dimensions.y;

  if (!xColumn || !yColumn) {
    throw new Error(`XY panel "${title}" is missing x or y dimension`);
  }

  return {
    type: seriesType,
    title,
    dataset: {
      type: 'esql',
      query,
    },
    layers: [
      {
        type: seriesType,
        x: buildEsqlColumnRef(xColumn, columnMetadata),
        y: [buildEsqlColumnRef(yColumn, columnMetadata)],
      },
    ],
  } as unknown as LensApiSchemaType;
}

/**
 * Converts a raw pie chart panel to Lens API format.
 */
function convertPiePanelToLensApi(panel: RawDashboardPanel): LensApiSchemaType {
  const { query, dimensions, columnMetadata, title } = panel;
  const partitionColumn = dimensions.partition;
  const valueColumn = dimensions.value;

  if (!partitionColumn || !valueColumn) {
    throw new Error(`Pie panel "${title}" is missing partition or value dimension`);
  }

  return {
    type: 'pie',
    title,
    dataset: {
      type: 'esql',
      query,
    },
    metrics: [buildEsqlColumnRef(valueColumn, columnMetadata)],
    group_by: [buildEsqlColumnRef(partitionColumn, columnMetadata)],
  } as unknown as LensApiSchemaType;
}

/**
 * Converts a raw data table panel to Lens API format.
 */
function convertDataTablePanelToLensApi(panel: RawDashboardPanel): LensApiSchemaType {
  const { query, dimensions, columnMetadata, title } = panel;
  const columns = dimensions.columns || [];

  if (columns.length === 0) {
    throw new Error(`Data table panel "${title}" has no columns defined`);
  }

  // All columns become metrics in the datatable
  const metrics = columns.map((col) => buildEsqlColumnRef(col, columnMetadata));

  return {
    type: 'datatable',
    title,
    dataset: {
      type: 'esql',
      query,
    },
    metrics,
  } as unknown as LensApiSchemaType;
}

/**
 * Converts a raw dashboard panel to Lens API format based on its type.
 */
function convertPanelToLensApi(panel: RawDashboardPanel): LensApiSchemaType {
  switch (panel.type) {
    case 'line_chart':
      return convertXYPanelToLensApi(panel, 'line');
    case 'area_chart':
      return convertXYPanelToLensApi(panel, 'area_stacked');
    case 'bar_chart':
      return convertXYPanelToLensApi(panel, 'bar_stacked');
    case 'pie_chart':
      return convertPiePanelToLensApi(panel);
    case 'data_table':
      return convertDataTablePanelToLensApi(panel);
    default:
      throw new Error(`Unsupported panel type: ${panel.type}`);
  }
}

/**
 * Converts a raw dashboard panel to a Kibana dashboard panel with Lens visualization.
 */
function convertToKibanaDashboardPanel(
  panel: RawDashboardPanel,
  configBuilder: LensConfigBuilder
): DashboardPanel {
  const lensApiConfig = convertPanelToLensApi(panel);
  const lensAttributes: LensAttributes = configBuilder.fromAPIFormat(lensApiConfig);

  const { position } = panel;

  return {
    type: 'lens',
    grid: {
      x: position.x,
      y: position.y,
      w: Math.min(position.width, DASHBOARD_GRID_COLUMN_COUNT),
      h: position.height || DEFAULT_PANEL_HEIGHT,
    },
    uid: panel.id,
    config: {
      title: panel.title,
      attributes: lensAttributes,
    },
  };
}

/**
 * Converts a raw dashboard suggestion to Kibana dashboard input.
 *
 * This transforms the raw dashboard structure (from the LLM suggestion) into
 * the format expected by DashboardRenderer's getCreationOptions callback.
 *
 * @param rawDashboard - The raw dashboard from dashboard suggestion result
 * @returns Dashboard input suitable for DashboardRenderer
 */
export function convertRawDashboardToKibanaInput(rawDashboard: RawDashboard): {
  panels: DashboardState['panels'];
  title: string;
  description?: string;
  timeRange: { from: string; to: string };
} {
  const configBuilder = new LensConfigBuilder();
  const convertedPanels: DashboardPanel[] = [];

  for (const panel of rawDashboard.panels) {
    try {
      const kibanaPanelInput = convertToKibanaDashboardPanel(panel, configBuilder);
      convertedPanels.push(kibanaPanelInput);
    } catch (error) {
      // Log but don't fail on individual panel conversion errors
      // eslint-disable-next-line no-console
      console.warn(`Failed to convert panel "${panel.title}":`, error);
    }
  }

  return {
    panels: convertedPanels as DashboardState['panels'],
    title: rawDashboard.title,
    description: rawDashboard.description,
    timeRange: rawDashboard.timeRange,
  };
}

/**
 * Gets a default time range for the dashboard.
 */
export function getDefaultTimeRange(): { from: string; to: string } {
  return { from: 'now-24h', to: 'now' };
}
