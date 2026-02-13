/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { API_VERSIONS, ACTIONS_INDEX } from '../../../common/constants';
import { PLUGIN_ID } from '../../../common';

const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 256;

export const updateLiveQueryRoute = (
  router: IRouter<DataRequestHandlerContext>,
  osqueryContext: OsqueryAppContext
) => {
  router.versioned
    .put({
      access: 'public',
      path: '/api/osquery/live_queries/{id}',
      security: {
        authz: {
          requiredPrivileges: [`${PLUGIN_ID}-writeLiveQueries`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            params: schema.object({
              id: schema.string(),
            }),
            body: schema.object({
              tags: schema.maybe(
                schema.arrayOf(schema.string({ maxLength: MAX_TAG_LENGTH, minLength: 1 }), {
                  maxSize: MAX_TAGS,
                })
              ),
            }),
          },
        },
      },
      async (context, request, response) => {
        try {
          const [coreStartServices] = await osqueryContext.getStartServices();
          const esClient = coreStartServices.elasticsearch.client.asInternalUser;
          const { id: actionId } = request.params;
          const { tags } = request.body;

          const searchResult = await esClient.search({
            index: `${ACTIONS_INDEX}-default`,
            size: 1,
            query: {
              bool: {
                must: [
                  { term: { action_id: actionId } },
                  { term: { type: 'INPUT_ACTION' } },
                  { term: { input_type: 'osquery' } },
                ],
              },
            },
            _source: false,
          });

          const hit = searchResult.hits.hits[0];

          if (!hit) {
            return response.notFound({
              body: { message: `Action ${actionId} not found` },
            });
          }

          const updateFields: Record<string, unknown> = {};
          if (tags !== undefined) {
            updateFields.tags = tags;
          }

          if (Object.keys(updateFields).length === 0) {
            return response.badRequest({
              body: { message: 'No fields to update' },
            });
          }

          await esClient.update({
            index: `${ACTIONS_INDEX}-default`,
            id: hit._id as string,
            doc: updateFields,
            refresh: 'wait_for',
          });

          return response.ok({
            body: { data: { action_id: actionId, ...updateFields } },
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
