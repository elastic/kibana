/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import * as t from 'io-ts';
import { transformError } from '@kbn/securitysolution-es-utils';

import { SortCombinations } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { RacRequestHandlerContext } from '../types';
import { BASE_RAC_ALERTS_API_PATH } from '../../common/constants';
import { buildRouteValidation } from './utils/route_validation';
import { alertsAggregationsSchema, alertsGroupFilterSchema } from '../../common/types';
import { DEFAULT_ALERTS_GROUP_BY_FIELD_SIZE } from '../alert_data_client/constants';

export const getAlertsGroupAggregations = (router: IRouter<RacRequestHandlerContext>) => {
  router.post(
    {
      path: `${BASE_RAC_ALERTS_API_PATH}/_group_aggregations`,
      validate: {
        body: buildRouteValidation(
          t.intersection([
            t.exact(
              t.type({
                ruleTypeIds: t.array(t.string),
                groupByField: t.string,
                aggregations: t.union([alertsAggregationsSchema, t.undefined]),
                filters: t.union([t.array(alertsGroupFilterSchema), t.undefined]),
                sort: t.union([t.array(t.object), t.undefined]),
                pageIndex: t.union([t.number, t.undefined]),
                pageSize: t.union([t.number, t.undefined]),
              })
            ),
            t.exact(
              t.partial({
                consumers: t.array(t.string),
              })
            ),
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
    async (context, request, response) => {
      const {
        ruleTypeIds,
        consumers,
        groupByField,
        aggregations,
        filters,
        sort,
        pageIndex = 0,
        pageSize = DEFAULT_ALERTS_GROUP_BY_FIELD_SIZE,
      } = request.body;
      try {
        const racContext = await context.rac;
        const alertsClient = await racContext.getAlertsClient();
        const alerts = await alertsClient.getGroupAggregations({
          ruleTypeIds,
          consumers,
          groupByField,
          aggregations,
          filters,
          sort: sort as SortCombinations[],
          pageIndex,
          pageSize,
        });
        return response.ok({
          body: alerts,
        });
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
