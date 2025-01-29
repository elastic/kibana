/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notImplemented } from '@hapi/boom';
import * as t from 'io-ts';
import {
  DataStreamDocsStat,
  FailedDocsDetails,
  FailedDocsErrorsResponse,
} from '../../../../common/api_types';
import { rangeRt, typesRt } from '../../../types/default_api_types';
import { createDatasetQualityServerRoute } from '../../create_datasets_quality_server_route';
import { getFailedDocsPaginated } from './get_failed_docs';
import { getFailedDocsDetails } from './get_failed_docs_details';
import { getFailedDocsErrors } from './get_failed_docs_errors';

const failedDocsRoute = createDatasetQualityServerRoute({
  endpoint: 'GET /internal/dataset_quality/data_streams/failed_docs',
  params: t.type({
    query: t.intersection([
      rangeRt,
      t.type({ types: typesRt }),
      t.partial({
        datasetQuery: t.string,
      }),
    ]),
  }),
  options: {
    tags: [],
  },
  security: {
    authz: {
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
    },
  },
  async handler(resources): Promise<{
    failedDocs: DataStreamDocsStat[];
  }> {
    const { context, params, logger, getEsCapabilities } = resources;
    const coreContext = await context.core;
    const isServerless = (await getEsCapabilities()).serverless;

    if (isServerless) {
      throw notImplemented('Failure store is not available in serverless mode');
    }

    const esClient = coreContext.elasticsearch.client.asCurrentUser;

    try {
      const failedDocs = await getFailedDocsPaginated({
        esClient,
        ...params.query,
      });

      return {
        failedDocs,
      };
    } catch (e) {
      logger.error(`Failed to get failed docs: ${e}`);

      return {
        failedDocs: [],
      };
    }
  },
});

const failedDocsDetailsRoute = createDatasetQualityServerRoute({
  endpoint: 'GET /internal/dataset_quality/data_streams/{dataStream}/failed_docs',
  params: t.type({
    path: t.type({
      dataStream: t.string,
    }),
    query: rangeRt,
  }),
  options: {
    tags: [],
  },
  security: {
    authz: {
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
    },
  },
  async handler(resources): Promise<FailedDocsDetails> {
    const { context, params, getEsCapabilities } = resources;
    const coreContext = await context.core;
    const { dataStream } = params.path;
    const isServerless = (await getEsCapabilities()).serverless;

    if (isServerless) {
      throw notImplemented('Failure store is not available in serverless mode');
    }

    const esClient = coreContext.elasticsearch.client.asCurrentUser;

    return await getFailedDocsDetails({
      esClient,
      dataStream,
      ...params.query,
    });
  },
});

const failedDocsErrorsRoute = createDatasetQualityServerRoute({
  endpoint: 'GET /internal/dataset_quality/data_streams/{dataStream}/failed_docs/errors',
  params: t.type({
    path: t.type({
      dataStream: t.string,
    }),
    query: rangeRt,
  }),
  options: {
    tags: [],
  },
  security: {
    authz: {
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
    },
  },
  async handler(resources): Promise<FailedDocsErrorsResponse> {
    const { context, params, getEsCapabilities } = resources;
    const coreContext = await context.core;
    const esClient = coreContext.elasticsearch.client.asCurrentUser;
    const isServerless = (await getEsCapabilities()).serverless;

    if (isServerless) {
      throw notImplemented('Failure store is not available in serverless mode');
    }

    return await getFailedDocsErrors({
      esClient,
      dataStream: params.path.dataStream,
      ...params.query,
    });
  },
});

export const failedDocsRouteRepository = {
  ...failedDocsRoute,
  ...failedDocsDetailsRoute,
  ...failedDocsErrorsRoute,
};
