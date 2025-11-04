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

export const bulkPatchAlertTagsRoute = (router: IRouter<RacRequestHandlerContext>) => {
  router.patch(
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
            t.union([
              t.strict({
                tags: t.array(t.string),
                addTags: t.undefined,
                removeTags: t.undefined,
              }),
              t.partial({
                tags: t.undefined,
                addTags: t.array(t.string),
                removeTags: t.array(t.string),
              }),
            ]),
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
        const { query, alertIds, index, addTags, removeTags, tags } = req.body;

        if (alertIds != null && alertIds.length > 1000) {
          return response.badRequest({
            body: {
              message: 'cannot use more than 1000 ids',
            },
          });
        }

        const updatedAlert = await alertsClient.patchTags({
          alertIds,
          addTags,
          removeTags,
          tags,
          query,
          index,
        });

        if (updatedAlert == null) {
          return response.notFound({
            body: { message: `alerts with ids ${alertIds} and index ${index} not found` },
          });
        }

        return response.ok({ body: { success: true, ...updatedAlert } });
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
