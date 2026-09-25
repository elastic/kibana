/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import {
  DATA_STREAMS_SEARCH_INTERNAL_API_VERSION,
  DATA_STREAMS_SEARCH_PATH,
  MAX_DATA_STREAM_SEARCH_LENGTH,
  MAX_DATA_STREAM_SEARCH_RESULTS,
} from '../../common/constants';
import type { SearchDataStreamsResponse } from '../../common/http_api/data_streams';
import { apiPrivileges } from '../../common/features';
import { withContextEngineFeatureFlag } from './with_feature_flag';

const READ_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.readContextEngine] },
};

const searchDataStreamsQuerySchema = schema.object({
  search: schema.maybe(schema.string({ maxLength: MAX_DATA_STREAM_SEARCH_LENGTH })),
});

export const registerDataStreamsRoutes = ({ router }: { router: IRouter }): void => {
  router.versioned
    .get({
      path: DATA_STREAMS_SEARCH_PATH,
      security: READ_SECURITY,
      access: 'internal',
      summary: 'Search data streams',
      description:
        'Searches Elasticsearch data streams by name substring, excluding hidden streams. Backs the AI index trace picker.',
    })
    .addVersion(
      {
        version: DATA_STREAMS_SEARCH_INTERNAL_API_VERSION,
        validate: { request: { query: searchDataStreamsQuerySchema } },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
        const { search } = request.query;
        const pattern = search ? `*${search}*` : '*';
        const { data_streams: dataStreams } = await esClient.indices.getDataStream({
          name: pattern,
          expand_wildcards: 'all',
        });
        const visible = dataStreams.filter((ds) => !ds.hidden);
        const body: SearchDataStreamsResponse = {
          dataStreams: visible.map((ds) => ds.name).slice(0, MAX_DATA_STREAM_SEARCH_RESULTS),
        };
        return response.ok({ body });
      })
    );
};
