/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/config-schema';
import { datatableConfigSchemaNoESQL } from '@kbn/lens-embeddable-utils/config_builder/schema';

interface VizSchemaMapping {
  schema: Type<unknown>;
  /** Top-level keys to include as flyout sections. If undefined, include all non-excluded keys */
  includeSections?: string[];
  /** Top-level keys to always exclude */
  excludeSections?: string[];
}

/**
 * Map from Lens visualization ID to schema mapping.
 * Only "settings" portions (styling, appearance) are included —
 * structural fields (type, layers, data_source, metrics, rows, etc.) are excluded.
 */
export const vizSchemaMap: Record<string, VizSchemaMapping> = {
  lnsDatatable: {
    schema: datatableConfigSchemaNoESQL,
    excludeSections: [
      'type',
      'title',
      'description',
      'data_source',
      'layer_settings',
      'metrics',
      'rows',
      'split_metrics_by',
      'references',
      'filters',
      'time_shift',
      'reduce_time_range',
    ],
  },
};

export const hasSchemaForVisualization = (vizId: string): boolean => vizId in vizSchemaMap;

export const getSchemaForVisualization = (vizId: string): VizSchemaMapping | undefined =>
  vizSchemaMap[vizId];
