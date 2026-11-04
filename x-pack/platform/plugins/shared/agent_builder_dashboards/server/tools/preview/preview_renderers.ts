/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataTablePreviewRenderer } from './render_data_table_preview';
import { gaugePreviewRenderer } from './render_gauge_preview';
import { heatmapPreviewRenderer } from './render_heatmap_preview';
import { legacyMetricPreviewRenderer } from './render_legacy_metric_preview';
import { metricPreviewRenderer } from './render_metric_preview';
import { partitionPreviewRenderer } from './render_partition_preview';
import { regionMapPreviewRenderer } from './render_region_map_preview';
import { tagCloudPreviewRenderer } from './render_tag_cloud_preview';
import { xyPreviewRenderer } from './render_xy_preview';
import type { PanelPreviewRenderer } from './types';

/** The preview renderer of each Lens API chart type (`config.type`) that has one. */
export const PREVIEW_RENDERERS: Readonly<Record<string, PanelPreviewRenderer>> = {
  xy: xyPreviewRenderer,
  metric: metricPreviewRenderer,
  legacy_metric: legacyMetricPreviewRenderer,
  gauge: gaugePreviewRenderer,
  heatmap: heatmapPreviewRenderer,
  pie: partitionPreviewRenderer,
  treemap: partitionPreviewRenderer,
  mosaic: partitionPreviewRenderer,
  waffle: partitionPreviewRenderer,
  tag_cloud: tagCloudPreviewRenderer,
  data_table: dataTablePreviewRenderer,
  region_map: regionMapPreviewRenderer,
};
