/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import type { AttachmentPanel, DashboardAttachmentData } from './types';
import { isSection } from './types';

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const nonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined;

/** The readable name of an ES|QL column reference: its label, else the column alias itself. */
const columnLabel = (reference: unknown): string | undefined =>
  isRecord(reference)
    ? nonEmptyString(reference.label) ?? nonEmptyString(reference.column)
    : undefined;

const firstColumnLabel = (
  references: unknown,
  prefer?: (reference: UnknownRecord) => boolean
): string | undefined => {
  if (!Array.isArray(references)) {
    return undefined;
  }
  const records = references.filter(isRecord);
  const preferred = prefer ? records.find(prefer) : undefined;
  return columnLabel(preferred ?? records[0]);
};

const firstRecord = (values: unknown): UnknownRecord | undefined =>
  Array.isArray(values) ? values.find(isRecord) : undefined;

/**
 * A label for an untitled Lens API config, taken from the measure the chart is built around:
 * the primary metric, the first y column of the first layer, the first partition metric, or the
 * single metric of gauge-like charts. Returns undefined for chart types without a named measure.
 */
export const getLensConfigLabel = (config: UnknownRecord): string | undefined => {
  switch (config.type) {
    case 'metric':
    case 'legacy_metric':
      return (
        firstColumnLabel(config.metrics, (metric) => metric.type === 'primary') ??
        columnLabel(config.metric)
      );
    case 'xy': {
      const layer = firstRecord(config.layers);
      return layer ? firstColumnLabel(layer.y) ?? columnLabel(layer.x) : undefined;
    }
    case 'pie':
    case 'treemap':
    case 'mosaic':
    case 'waffle':
      return firstColumnLabel(config.metrics);
    case 'gauge':
    case 'tagcloud':
    case 'heatmap':
    case 'region_map':
      return columnLabel(config.metric);
    case 'datatable':
      return firstColumnLabel(config.metrics) ?? firstColumnLabel(config.columns);
    default:
      return undefined;
  }
};

/**
 * The name to show for a dashboard panel: its title when it has one, otherwise a label derived
 * from the chart config for ES|QL Lens panels. Custom panels and other types have no derivable
 * name and yield undefined when untitled.
 */
export const getPanelLabel = (
  panel: Pick<AttachmentPanel, 'type' | 'config'>
): string | undefined => {
  const title = nonEmptyString(panel.config.title);
  if (title) {
    return title;
  }
  return panel.type === LENS_EMBEDDABLE_TYPE ? getLensConfigLabel(panel.config) : undefined;
};

/** Finds a panel by id at the top level or inside a section. */
export const findPanelById = (
  panels: DashboardAttachmentData['panels'],
  panelId: string
): AttachmentPanel | undefined => {
  for (const widget of panels) {
    if (isSection(widget)) {
      const panel = widget.panels.find(({ id }) => id === panelId);
      if (panel) {
        return panel;
      }
    } else if (widget.id === panelId) {
      return widget;
    }
  }
  return undefined;
};
