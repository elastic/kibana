/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';

import { schema } from '@kbn/config-schema';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { RacRequestHandlerContext } from '../types';
import { BASE_RAC_ALERTS_API_PATH } from '../../common/constants';
import {
  MAX_ALERT_IDS_PER_REQUEST,
  MAX_INDEX_NAME,
  MAX_QUERY_LENGTH,
  MAX_TAGS_TO_UPDATE,
} from '../alert_data_client/constants';

const bodySchema = schema.object({
  index: schema.string({ maxLength: MAX_INDEX_NAME }),
  add: schema.maybe(schema.arrayOf(schema.string(), { minSize: 1, maxSize: MAX_TAGS_TO_UPDATE })),
  remove: schema.maybe(
    schema.arrayOf(schema.string(), { minSize: 1, maxSize: MAX_TAGS_TO_UPDATE })
  ),
  alertIds: schema.maybe(
    schema.arrayOf(schema.string(), { minSize: 1, maxSize: MAX_ALERT_IDS_PER_REQUEST })
  ),
  query: schema.maybe(schema.string({ maxLength: MAX_QUERY_LENGTH })),
});

export const bulkUpdateTagsRoute = (router: IRouter<RacRequestHandlerContext>) => {
  router.post(
    {
      path: `${BASE_RAC_ALERTS_API_PATH}/tags`,
      validate: {
        body: bodySchema,
      },
      security: {
        authz: {
          requiredPrivileges: ['rac'],
        },
      },
      options: {
        access: 'internal',
      },
    },
    async (context, req, response) => {
      try {
        const racContext = await context.rac;
        const alertsClient = await racContext.getAlertsClient();
        const { query, alertIds, index, add, remove } = req.body;

        if (alertIds && query) {
          return response.badRequest({
            body: { message: 'Cannot specify both alertIds and query' },
          });
        }

        if (add == null && remove == null) {
          return response.badRequest({
            body: { message: 'No tags to add or remove were provided' },
          });
        }

        const res = await alertsClient.bulkUpdateTags({
          alertIds,
          add,
          remove,
          query,
          index,
        });

        return response.multiStatus({ body: res });
      } catch (exc) {
        const err = transformError(exc);

        const contentType = {
          'content-type': 'application/json',
        };
        const defaultedHeaders = {
          ...contentType,
        };

        return response.customError({
          headers: defaultedHeaders,
          statusCode: err.statusCode,
          body: {
            message: err.message,
            attributes: {
              success: false,
            },
          },
        });
      }
    }
  );
};
