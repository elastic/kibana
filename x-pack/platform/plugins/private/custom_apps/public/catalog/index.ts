/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Catalog } from '@kbn/a2ui-renderer';
import { euiCatalog } from '@kbn/a2ui-eui-catalog';
import { KbnLensPanel } from './kbn_lens_panel';
import { Chart } from './chart';
import { KbnTimeFilter } from './kbn_time_filter';
import { KbnCustomContentPanel } from './kbn_custom_content_panel';
import { StatusGrid } from './status_grid';
import { MetricChart } from './metric_chart';

/**
 * The base catalog is a shared package and stays pure EUI, so it can be used
 * anywhere without pulling plugin dependencies. Kibana-backed components live
 * here in the plugin and are composed on top.
 *
 * Only the runtime implementations are assembled here. Their schemas come from
 * `common/catalog_schema`, which the server shares — a test asserts the two stay
 * in step.
 */
export const customAppCatalog: Catalog = {
  ...euiCatalog,
  components: {
    ...euiCatalog.components,
    [Chart.name]: Chart,
    [KbnTimeFilter.name]: KbnTimeFilter,
    [KbnLensPanel.name]: KbnLensPanel,
    [KbnCustomContentPanel.name]: KbnCustomContentPanel,
    [StatusGrid.name]: StatusGrid,
    [MetricChart.name]: MetricChart,
  },
};

export { customAppCatalogSchema, KIBANA_COMPONENT_SCHEMAS } from '../../common/catalog_schema';

export { CustomAppServicesProvider, useCustomAppServices } from './services_context';
export type { CustomAppServices } from './services_context';
