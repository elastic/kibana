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

    const dataStream = privileges.view_index_metadata
      ? await streamsClient.getDataStream(name).catch(() => null)
      : null;

    // If we can resolve the data stream and it is not in time_series mode, there is
    // no meaningful time series count.
    if (dataStream && dataStream.index_mode !== 'time_series') {
      return { timeSeriesCount: null };
    }

    try {
      const tsCommand = BasicPrettyPrinter.print(
        Builder.expression.query([
          Builder.command({
            name: 'ts',
            args: [Builder.expression.source.index(name)],
          }),
        ])
      );

      // TS_INFO returns one row per time series. Use STATS to avoid transferring
      // the full result set.
      const esqlQuery = `
${tsCommand}
| TS_INFO
| STATS time_series_count = COUNT(*)
      `.trim();

      const response = await scopedClusterClient.asCurrentUser.esql.query({
        query: esqlQuery,
        drop_null_columns: true,
      });

      const countCol = response.columns.findIndex((col) => col.name === 'time_series_count');
      const countValue = countCol === -1 ? undefined : response.values[0]?.[countCol];
      const count = typeof countValue === 'number' ? countValue : Number(countValue);

      return { timeSeriesCount: Number.isFinite(count) ? count : null };
    } catch (error) {
      // The time series count is additional metadata; avoid failing the whole
      // request if it can't be computed (e.g. missing index, permissions, etc).
      return { timeSeriesCount: null };
    }
  },
});

export const timeSeriesRoutes = {
  ...getTimeSeriesCountRoute,
};
