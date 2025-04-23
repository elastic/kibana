/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { IRouter } from '@kbn/core/server';
import * as t from 'io-ts';
import { transformError } from '@kbn/securitysolution-es-utils';
import moment from 'moment';
import type { estypes } from '@elastic/elasticsearch';

import type { RacRequestHandlerContext } from '../types';
import { BASE_RAC_ALERTS_API_PATH } from '../../common/constants';
import { buildRouteValidation } from './utils/route_validation';

export const getAlertSummaryRoute = (router: IRouter<RacRequestHandlerContext>) => {
  router.post(
    {
      path: `${BASE_RAC_ALERTS_API_PATH}/_alert_summary`,
      validate: {
        body: buildRouteValidation(
          t.intersection([
            t.exact(
              t.type({
                gte: t.string,
                lte: t.string,
                ruleTypeIds: t.array(t.string),
              })
            ),
            t.exact(
              t.partial({
                fixed_interval: t.string,
                filter: t.array(t.object),
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
      try {
        const racContext = await context.rac;
        const cckClient = await racContext.cckClientGetter();
        const alertsClient = await racContext.getAlertsClient();
        const {
          gte,
          lte,
          ruleTypeIds,
          consumers,
          filter,
          fixed_interval: fixedInterval,
        } = request.body;
        if (
          !(
            moment(gte, 'YYYY-MM-DDTHH:mm:ss.SSSZ', true).isValid() &&
            moment(lte, 'YYYY-MM-DDTHH:mm:ss.SSSZ', true).isValid()
          )
        ) {
          throw Boom.badRequest('gte and/or lte are not following the UTC format');
        }

        if (fixedInterval && fixedInterval?.match(/^\d{1,6}['s','m','h','d']$/) == null) {
          throw Boom.badRequest(
            `fixed_interval (value: ${fixedInterval}) is not following the expected format 1s, 1m, 1h, 1d with at most 6 digits`
          );
        }

        const aggs = await alertsClient.getAlertSummary({
          gte,
          lte,
          ruleTypeIds,
          consumers,
          filter: filter as estypes.QueryDslQueryContainer[],
          fixedInterval,
        });

        const remoteAggs = await cckClient.request<typeof aggs>(
          'POST',
          '/internal/rac/alerts/_alert_summary',
          request.body
        );

        /* aggs is  {
    activeAlertCount: number;
    recoveredAlertCount: number;
    activeAlerts: estypes.AggregationsBuckets<estypes.AggregationsDateHistogramBucket>;
    recoveredAlerts: estypes.AggregationsBuckets<...>;
}*/
        function mergeBuckets(
          buckets: estypes.AggregationsDateHistogramBucket[],
          remoteBuckets: estypes.AggregationsDateHistogramBucket[]
        ) {
          const merged = [...buckets];
          remoteBuckets.forEach((bucket) => {
            const existingBucket = merged.find((b) => b.key === bucket.key);
            if (existingBucket) {
              existingBucket.doc_count += bucket.doc_count;
            } else {
              merged.push(bucket);
            }
          });
          return merged;
        }
        const mergedAggs = remoteAggs.reduce((acc, curr) => {
          if (curr.status === 'rejected') {
            return acc;
          }
          const { data } = curr.value;
          acc.activeAlertCount += data.activeAlertCount;
          acc.recoveredAlertCount += data.recoveredAlertCount;
          acc.activeAlerts = mergeBuckets(
            acc.activeAlerts as estypes.AggregationsDateHistogramBucket[],
            data.activeAlerts as estypes.AggregationsDateHistogramBucket[]
          );
          acc.recoveredAlerts = mergeBuckets(
            acc.recoveredAlerts as estypes.AggregationsDateHistogramBucket[],
            data.recoveredAlerts as estypes.AggregationsDateHistogramBucket[]
          );
          return acc;
        }, aggs);
        return response.ok({
          body: mergedAggs,
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
