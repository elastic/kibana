/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { BasicPrettyPrinter, Builder } from '@elastic/esql';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';

export const getTimeSeriesCountRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/time_series/_count',
  options: {
    access: 'internal',
    summary: 'Get time series count',
    description:
      'Gets the number of distinct time series for a stream, when backed by a time series data stream.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
  }),
  handler: async ({ params, request, getScopedClients }) => {
    const { scopedClusterClient, streamsClient } = await getScopedClients({ request });
    const { name } = params.path;

    const privileges = await streamsClient.getPrivileges(name);
    if (!privileges.monitor) {
      return { timeSeriesCount: null };
    }

    // Without metadata privileges we can't reliably decide if the stream is backed
    // by a TSDS and therefore can't compute a meaningful time series count.
    if (!privileges.view_index_metadata) {
      return { timeSeriesCount: null };
    }

    const dataStream = await streamsClient.getDataStream(name).catch(() => null);
    if (!dataStream) {
      return { timeSeriesCount: null };
    }

    // If we can resolve the data stream and it is not in time_series mode, there is
    // no meaningful time series count.
    if (dataStream.index_mode !== 'time_series') {
      return { timeSeriesCount: null };
    }

    const esqlQuery = BasicPrettyPrinter.print(
      Builder.expression.query([
        Builder.command({
          name: 'ts',
          args: [Builder.expression.source.index(name)],
        }),
        Builder.command({
          name: 'ts_info',
          args: [],
        }),
        Builder.command({
          name: 'stats',
          args: [
            Builder.expression.func.binary('=', [
              Builder.expression.column('time_series_count'),
              Builder.expression.func.call('COUNT', [Builder.expression.column('*')]),
            ]),
          ],
        }),
      ])
    );

    const response = await scopedClusterClient.asCurrentUser.esql.query({
      query: esqlQuery,
      drop_null_columns: true,
    });

    const countCol = response.columns.findIndex((col) => col.name === 'time_series_count');
    if (countCol === -1) {
      throw new Error('Unexpected ES|QL response: missing [time_series_count] column');
    }

    const countValue = response.values[0]?.[countCol];
    if (typeof countValue !== 'number') {
      throw new Error('Unexpected ES|QL response: [time_series_count] is not a number');
    }

    return { timeSeriesCount: countValue };
  },
});

export const timeSeriesRoutes = {
  ...getTimeSeriesCountRoute,
};
