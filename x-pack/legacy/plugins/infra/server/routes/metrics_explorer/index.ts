/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { InfraBackendLibs } from '../../lib/infra_types';
import { getGroupings } from './lib/get_groupings';
import { populateSeriesWithTSVBData } from './lib/populate_series_with_tsvb_data';
import { MetricsExplorerRequestBody } from './types';
// import { metricsExplorerSchema } from './schema';
// import { MetricsExplorerResponse, MetricsExplorerRequestBody } from './types';

// NP_TODO: need to replace all of this with real types or io-ts or something?
const escapeHatch = schema.object({}, { allowUnknowns: true });

export const initMetricExplorerRoute = (libs: InfraBackendLibs) => {
  const { framework } = libs;
  const { callWithRequest } = framework;

  framework.registerRoute(
    {
      method: 'post',
      path: '/api/infra/metrics_explorer',
      validate: {
        body: escapeHatch,
      },
    },
    async (requestContext, request, response) => {
      try {
        const search = <Aggregation>(searchOptions: object) =>
          callWithRequest<{}, Aggregation>(requestContext, 'search', searchOptions);
        const options = request.body as MetricsExplorerRequestBody; // Need to remove this casting and swap in config-schema demands :(
        // First we get the groupings from a composite aggregation
        const groupings = await getGroupings(search, options);

        // Then we take the results and fill in the data from TSVB with the
        // user's custom metrics
        const seriesWithMetrics = await Promise.all(
          groupings.series.map(
            populateSeriesWithTSVBData(request, options, framework, requestContext)
          )
        );
        return response.ok({ body: { ...groupings, series: seriesWithMetrics } });
      } catch (error) {
        return response.internalError({
          body: error.message,
        });
      }
    }
  );
};
