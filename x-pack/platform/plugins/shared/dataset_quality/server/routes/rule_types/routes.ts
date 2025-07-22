/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { PreviewChartResponse } from '../../../common/api_types';
import { createDatasetQualityServerRoute } from '../create_datasets_quality_server_route';
import { getChartPreview } from '../../rule_types/degraded_docs/get_chart_preview';
import { groupByRt } from '../../types/default_api_types';

const degradedDocsChartPreviewRoute = createDatasetQualityServerRoute({
  endpoint: 'GET /internal/dataset_quality/rule_types/degraded_docs/chart_preview',
  params: t.type({
    query: t.type({
      index: t.string,
      groupBy: groupByRt,
      start: t.string,
      end: t.string,
      interval: t.string,
    }),
  }),
  options: {
    tags: [],
  },
  security: {
    authz: {
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
    },
  },
  async handler(resources): Promise<PreviewChartResponse> {
    const { context, params } = resources;
    const coreContext = await context.core;

    const esClient = coreContext.elasticsearch.client.asCurrentUser;

    const degradedDocsChartPreview = await getChartPreview({
      esClient,
      ...params.query,
    });

    return { ...degradedDocsChartPreview };
  },
});

export const ruleTypesRouteRepository = {
  ...degradedDocsChartPreviewRoute,
};
