/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { schema } from '@kbn/config-schema';
import { InfraBackendLibs } from '../../lib/infra_types';
import { getGroupings } from './lib/get_groupings';
import { populateSeriesWithTSVBData } from './lib/populate_series_with_tsvb_data';
import { metricsExplorerRequestBodyRT, metricsExplorerResponseRT } from '../../../common/http_api';
import { throwErrors } from '../../../common/runtime_types';

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
        const payload = pipe(
          metricsExplorerRequestBodyRT.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const search = <Aggregation>(searchOptions: object) =>
          callWithRequest<{}, Aggregation>(requestContext, 'search', searchOptions);

        // First we get the groupings from a composite aggregation
        const groupings = await getGroupings(search, payload);

        // Then we take the results and fill in the data from TSVB with the
        // user's custom metrics
        const seriesWithMetrics = await Promise.all(
          groupings.series.map(
            populateSeriesWithTSVBData(request, payload, framework, requestContext)
          )
        );
        return response.ok({
          body: metricsExplorerResponseRT.encode({ ...groupings, series: seriesWithMetrics }),
        });
      } catch (error) {
        return response.internalError({
          body: error.message,
        });
      }
    }
  );
};
