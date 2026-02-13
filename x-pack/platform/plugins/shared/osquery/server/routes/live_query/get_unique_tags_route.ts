/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { API_VERSIONS } from '../../../common/constants';
import { PLUGIN_ID } from '../../../common';
import { ACTIONS_INDEX } from '../../../common/constants';

export const getUniqueTagsRoute = (
  router: IRouter<DataRequestHandlerContext>,
  osqueryContext: OsqueryAppContext
) => {
  router.versioned
    .get({
      access: 'internal',
      path: '/internal/osquery/history/tags',
      security: {
        authz: {
          requiredPrivileges: [`${PLUGIN_ID}-readLiveQueries`],
        },
      },
      options: { tags: ['api'] },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {},
      },
      async (context, request, response) => {
        try {
          const [coreStartServices] = await osqueryContext.getStartServices();
          const esClient = coreStartServices.elasticsearch.client.asInternalUser;

          const spaceId = osqueryContext?.service?.getActiveSpace
            ? (await osqueryContext.service.getActiveSpace(request))?.id || DEFAULT_SPACE_ID
            : DEFAULT_SPACE_ID;

          const spaceFilter =
            spaceId === 'default'
              ? {
                  bool: {
                    should: [
                      { term: { space_id: 'default' } },
                      { bool: { must_not: { exists: { field: 'space_id' } } } },
                    ],
                  },
                }
              : { term: { space_id: spaceId } };

          const result = await esClient.search({
            index: `${ACTIONS_INDEX}*`,
            size: 0,
            query: {
              bool: {
                filter: [spaceFilter],
                must: [
                  { term: { type: 'INPUT_ACTION' } },
                  { term: { input_type: 'osquery' } },
                ],
              },
            },
            aggs: {
              unique_tags: {
                terms: {
                  field: 'tags',
                  size: 500,
                },
              },
            },
          });

          const buckets =
            (
              result.aggregations?.unique_tags as {
                buckets?: Array<{ key: string; doc_count: number }>;
              }
            )?.buckets ?? [];

          return response.ok({
            body: {
              tags: buckets.map((b) => b.key),
            },
          });
        } catch (e) {
          return response.customError({
            statusCode: e.statusCode ?? 500,
            body: { message: e.message },
          });
        }
      }
    );
};
