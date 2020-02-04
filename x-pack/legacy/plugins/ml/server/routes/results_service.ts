/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'src/core/server';
import { schema } from '@kbn/config-schema';
import { licensePreRoutingFactory } from '../new_platform/licence_check_pre_routing_factory';
import { wrapError } from '../client/error_wrapper';
import { RouteInitialization } from '../new_platform/plugin';
import { resultsServiceProvider } from '../models/results_service';

function getAnomaliesTableData(context: RequestHandlerContext, payload: any) {
  const rs = resultsServiceProvider(context);
  const {
    jobIds,
    criteriaFields,
    influencers,
    aggregationInterval,
    threshold,
    earliestMs,
    latestMs,
    dateFormatTz,
    maxRecords,
    maxExamples,
    influencersFilterQuery,
  } = payload;
  return rs.getAnomaliesTableData(
    jobIds,
    criteriaFields,
    influencers,
    aggregationInterval,
    threshold,
    earliestMs,
    latestMs,
    dateFormatTz,
    maxRecords,
    maxExamples,
    influencersFilterQuery
  );
}

function getCategoryDefinition(context: RequestHandlerContext, payload: any) {
  const rs = resultsServiceProvider(context);
  return rs.getCategoryDefinition(payload.jobId, payload.categoryId);
}

function getCategoryExamples(context: RequestHandlerContext, payload: any) {
  const rs = resultsServiceProvider(context);
  const { jobId, categoryIds, maxExamples } = payload;
  return rs.getCategoryExamples(jobId, categoryIds, maxExamples);
}

function getMaxAnomalyScore(context: RequestHandlerContext, payload: any) {
  const rs = resultsServiceProvider(context);
  const { jobIds, earliestMs, latestMs } = payload;
  return rs.getMaxAnomalyScore(jobIds, earliestMs, latestMs);
}

function getPartitionFieldsValues(context: RequestHandlerContext, payload: any) {
  const rs = resultsServiceProvider(context);
  const { jobId, searchTerm, criteriaFields, earliestMs, latestMs } = payload;
  return rs.getPartitionFieldsValues(jobId, searchTerm, criteriaFields, earliestMs, latestMs);
}

export function resultsServiceRoutes({ xpackMainPlugin, router }: RouteInitialization) {
  router.post(
    {
      path: '/api/ml/results/anomalies_table_data',
      validate: {
        body: schema.any(),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        // eslint-disable-next-line
        console.log('----- ANOMALIES TABLE DATA ---', JSON.stringify(request.body, null, 2));
        const resp = await getAnomaliesTableData(context, request.body);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  router.post(
    {
      path: '/api/ml/results/category_definition',
      validate: {
        body: schema.any(),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        // eslint-disable-next-line
        console.log('----- CATEGORY DEFINITION ---', JSON.stringify(request.body, null, 2));
        const resp = await getCategoryDefinition(context, request.body);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  router.post(
    {
      path: '/api/ml/results/max_anomaly_score',
      validate: {
        body: schema.any(),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        // eslint-disable-next-line
        console.log('----- MAX ANOMALY SCORE ---', JSON.stringify(request.body, null, 2));
        const resp = await getMaxAnomalyScore(context, request.body);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  router.post(
    {
      path: '/api/ml/results/category_examples',
      validate: {
        body: schema.any(),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        // eslint-disable-next-line
        console.log('----- CATEGORY EXAMPLES ---', JSON.stringify(request.body, null, 2));
        const resp = await getCategoryExamples(context, request.body);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  router.post(
    {
      path: '/api/ml/results/partition_fields_values',
      validate: {
        body: schema.any(),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        // eslint-disable-next-line
        console.log('----- PARTITION FIELD VALUES ---', JSON.stringify(request.body, null, 2));
        const resp = await getPartitionFieldsValues(context, request.body);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
