/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import * as t from 'io-ts';
import { transformError } from '@kbn/securitysolution-es-utils';

import { buildRouteValidation } from './utils/route_validation';
import type { RacRequestHandlerContext } from '../types';
import { BASE_RAC_ALERTS_API_PATH } from '../../common/constants';
import { MAX_ALERT_IDS_PER_REQUEST } from '../alert_data_client/constants';

export const bulkUpdateTagsRoute = (router: IRouter<RacRequestHandlerContext>) => {
  router.post(
    {
      path: `${BASE_RAC_ALERTS_API_PATH}/tags`,
      validate: {
        body: buildRouteValidation(
          t.intersection([
            t.type({
              index: t.string,
            }),
            t.union([
              t.strict({
                alertIds: t.array(t.string),
                query: t.undefined,
              }),
              t.strict({
                alertIds: t.undefined,
                query: t.union([t.object, t.string]),
              }),
            ]),
            t.partial({
              add: t.array(t.string),
              remove: t.array(t.string),
            }),
          ])
        ),
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

        if (alertIds && alertIds.length > MAX_ALERT_IDS_PER_REQUEST) {
          return response.badRequest({
            body: {
              message: `Cannot use more than ${MAX_ALERT_IDS_PER_REQUEST} ids`,
            },
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
