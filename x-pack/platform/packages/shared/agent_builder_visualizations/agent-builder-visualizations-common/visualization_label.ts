/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VisualizationAttachmentData } from './visualization_types';
import { getEffectiveRenderer, readAttachmentQueries } from './visualization_types';

const MAX_QUERY_LABEL_LENGTH = 50;

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
    case 'waffle':
      return firstColumnLabel(config.metrics);
    case 'gauge':
    case 'mosaic':
    case 'tag_cloud':
    case 'heatmap':
    case 'region_map':
      return columnLabel(config.metric);
    case 'data_table':
      return firstColumnLabel(config.metrics) ?? firstColumnLabel(config.rows);
    default:
      return undefined;
  }
};

const getQueryLabel = (data: VisualizationAttachmentData): string | undefined => {
  const [query] = readAttachmentQueries(data);
  const singleLine = query?.replace(/\s+/g, ' ').trim();
  if (!singleLine) {
    return undefined;
  }
  return singleLine.length > MAX_QUERY_LABEL_LENGTH
    ? `${singleLine.slice(0, MAX_QUERY_LABEL_LENGTH - 1).trimEnd()}…`
    : singleLine;
};

/**
 * The name to show for a visualization: its title, else the measure a Lens chart is built
 * around, else its first ES|QL query shortened to fit a pill. Undefined when none applies.
 */
export const getVisualizationLabel = (data: VisualizationAttachmentData): string | undefined => {
  const config: UnknownRecord = isRecord(data.visualization) ? data.visualization : {};
  return (
    nonEmptyString(config.title) ??
    (getEffectiveRenderer(data) === 'lens' ? getLensConfigLabel(config) : undefined) ??
    getQueryLabel(data)
  );
};
