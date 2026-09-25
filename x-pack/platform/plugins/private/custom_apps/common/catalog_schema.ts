/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The JSON itself, not the package entry point: `common` code cannot import a
// browser package, and the schema is the same object either way.
import euiCatalogSchema from '@kbn/a2ui-eui-catalog/catalog.json';
import {
  CHART_SCHEMA,
  KBN_CUSTOM_CONTENT_PANEL_SCHEMA,
  KBN_LENS_PANEL_SCHEMA,
  METRIC_CHART_SCHEMA,
  KBN_TIME_FILTER_SCHEMA,
  STATUS_GRID_SCHEMA,
} from './kbn_components_schema';
import type { describeCatalog } from './describe_catalog';

/**
 * The components this plugin adds on top of the shared EUI catalog. Declared once
 * here, in `common`, because the browser registry, the schema the editor validates
 * against and the prompt the Agent Builder tool ships all have to agree — and when
 * each kept its own copy of the merge they drifted.
 */
export const KIBANA_COMPONENT_SCHEMAS = {
  Chart: CHART_SCHEMA,
  KbnTimeFilter: KBN_TIME_FILTER_SCHEMA,
  KbnLensPanel: KBN_LENS_PANEL_SCHEMA,
  KbnCustomContentPanel: KBN_CUSTOM_CONTENT_PANEL_SCHEMA,
  StatusGrid: STATUS_GRID_SCHEMA,
  MetricChart: METRIC_CHART_SCHEMA,
} as const;

export const customAppCatalogSchema = {
  ...euiCatalogSchema,
  components: {
    ...euiCatalogSchema.components,
    ...KIBANA_COMPONENT_SCHEMAS,
  },
};

/**
 * `catalog.json` is typed from its literal contents, which is far narrower than the
 * structural shape `describeCatalog` reads. Casting in one place keeps the rest of
 * the plugin from repeating it.
 */
export const catalogForPrompt = customAppCatalogSchema as unknown as Parameters<
  typeof describeCatalog
>[0];
