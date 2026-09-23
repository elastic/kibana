/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Catalog } from '@kbn/a2ui-renderer';
import { euiCatalog, euiCatalogSchema } from '@kbn/a2ui-eui-catalog';
import { KbnLensPanel } from './kbn_lens_panel';
import { Chart } from './chart';
import { KbnTimeFilter } from './kbn_time_filter';
import {
  CHART_SCHEMA,
  KBN_LENS_PANEL_SCHEMA,
  KBN_TIME_FILTER_SCHEMA,
} from '../../common/kbn_components_schema';

/**
 * The base catalog is a shared package and stays pure EUI, so it can be used
 * anywhere without pulling plugin dependencies. Kibana-backed components live
 * here in the plugin and are composed on top.
 */
export const customAppCatalog: Catalog = {
  ...euiCatalog,
  components: {
    ...euiCatalog.components,
    [Chart.name]: Chart,
    [KbnTimeFilter.name]: KbnTimeFilter,
    [KbnLensPanel.name]: KbnLensPanel,
  },
};

export const customAppCatalogSchema = {
  ...euiCatalogSchema,
  components: {
    ...euiCatalogSchema.components,
    Chart: CHART_SCHEMA,
    KbnTimeFilter: KBN_TIME_FILTER_SCHEMA,
    KbnLensPanel: KBN_LENS_PANEL_SCHEMA,
  },
};

export { CustomAppServicesProvider, useCustomAppServices } from './services_context';
export type { CustomAppServices } from './services_context';
