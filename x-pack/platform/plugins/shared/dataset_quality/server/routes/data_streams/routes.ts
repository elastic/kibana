/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import {
  CheckAndLoadIntegrationResponse,
  DataStreamDetails,
  DataStreamDocsStat,
  DataStreamRolloverResponse,
  DataStreamSettings,
  DataStreamStat,
  DatasetUserPrivileges,
  DegradedFieldAnalysis,
  DegradedFieldResponse,
  DegradedFieldValues,
  NonAggregatableDatasets,
  UpdateFieldLimitResponse,
} from '../../../common/api_types';
import { datasetQualityPrivileges } from '../../services';
import { rangeRt, typeRt, typesRt } from '../../types/default_api_types';
import { createDatasetQualityESClient } from '../../utils';
import { createDatasetQualityServerRoute } from '../create_datasets_quality_server_route';
import { checkAndLoadIntegration } from './check_and_load_integration';
import { failedDocsRouteRepository } from './failed_docs/routes';
import { getDataStreamDetails } from './get_data_stream_details';
import { getDataStreams } from './get_data_streams';
import { getDataStreamsMeteringStats } from './get_data_streams_metering_stats';
import { getDataStreamsStats } from './get_data_streams_stats';
import { getAggregatedDatasetPaginatedResults } from './get_dataset_aggregated_paginated_results';
import { getDataStreamSettings } from './get_datastream_settings';
import { getDegradedDocsPaginated } from './get_degraded_docs';
import { analyzeDegradedField } from './get_degraded_field_analysis';
import { getDegradedFieldValues } from './get_degraded_field_values';
import { getDegradedFields } from './get_degraded_fields';
import { getNonAggregatableDataStreams } from './get_non_aggregatable_data_streams';
import { updateFieldLimit } from './update_field_limit';

const statsRoute = createDatasetQualityServerRoute({
  endpoint: 'GET /internal/dataset_quality/data_streams/stats',
  params: t.type({
    query: t.intersection([
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
    datasetUserPrivileges: DatasetUserPrivileges;
    dataStreamsStats: DataStreamStat[];
  }> {
    const { context, params, getEsCapabilities } = resources;
    const coreContext = await context.core;
    const isServerless = (await getEsCapabilities()).serverless;

    // Query datastreams as the current user as the Kibana internal user may not have all the required permissions
    const esClient = coreContext.elasticsearch.client.asCurrentUser;
    const esClientAsSecondaryAuthUser = coreContext.elasticsearch.client.asSecondaryAuthUser;

    const { dataStreams, datasetUserPrivileges } = await getDataStreams({
      esClient,
      ...params.query,
      uncategorisedOnly: false,
    });

    const privilegedDataStreams = dataStreams.filter((dataStream) => {
      return dataStream.userPrivileges.canMonitor;
    });

    const dataStreamsStats = isServerless
      ? await getDataStreamsMeteringStats({
          esClient: esClientAsSecondaryAuthUser,
          dataStreams: privilegedDataStreams.map((stream) => stream.name),
        })
      : await getDataStreamsStats({
          esClient,
          dataStreams: privilegedDataStreams.map((stream) => stream.name),
        });

    return {
      datasetUserPrivileges,
      dataStreamsStats: dataStreams.map((dataStream: DataStreamStat) => {
        dataStream.size = dataStreamsStats[dataStream.name]?.size;
        dataStream.sizeBytes = dataStreamsStats[dataStream.name]?.sizeBytes;
        dataStream.totalDocs = dataStreamsStats[dataStream.name]?.totalDocs;

        return dataStream;
      }),
    };
  },
});

const degradedDocsRoute = createDatasetQualityServerRoute({
  endpoint: 'GET /internal/dataset_quality/data_streams/degraded_docs',
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
    degradedDocs: DataStreamDocsStat[];
  }> {
    const { context, params } = resources;
    const coreContext = await context.core;

    const esClient = coreContext.elasticsearch.client.asCurrentUser;

    const degradedDocs = await getDegradedDocsPaginated({
      esClient,
      ...params.query,
    });

    return {
      degradedDocs,
    };
  },
});

const totalDocsRoute = createDatasetQualityServerRoute({
  endpoint: 'GET /internal/dataset_quality/data_streams/total_docs',
  params: t.type({
    query: t.intersection([rangeRt, typeRt]),
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
    totalDocs: DataStreamDocsStat[];
  }> {
    const { context, params } = resources;
    const coreContext = await context.core;

    const esClient = coreContext.elasticsearch.client.asCurrentUser;

    await datasetQualityPrivileges.throwIfCannotReadDataset(esClient, params.query.type);

    const { type, start, end } = params.query;

    const totalDocs = await getAggregatedDatasetPaginatedResults({
      esClient,
      start,
      end,
      index: `${type}-*-*`,
    });

    return {
      totalDocs,
    };
  },
});

const nonAggregatableDatasetsRoute = createDatasetQualityServerRoute({
  endpoint: 'GET /internal/dataset_quality/data_streams/non_aggregatable',
  params: t.type({
    query: t.intersection([
      rangeRt,
      t.type({ types: typesRt }),
      t.partial({
        dataStream: t.string,
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
  async handler(resources): Promise<NonAggregatableDatasets> {
    const { context, params } = resources;
    const coreContext = await context.core;

    const esClient = coreContext.elasticsearch.client.asCurrentUser;

    return await getNonAggregatableDataStreams({
      esClient,
      ...params.query,
    });
  },
});

const nonAggregatableDatasetRoute = createDatasetQualityServerRoute({
  endpoint: 'GET /internal/dataset_quality/data_streams/{dataStream}/non_aggregatable',
  params: t.type({
    path: t.type({
      dataStream: t.string,
    }),
    query: t.intersection([rangeRt, typeRt]),
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
  async handler(resources): Promise<NonAggregatableDatasets> {
    const { context, params } = resources;
    const coreContext = await context.core;

    const esClient = coreContext.elasticsearch.client.asCurrentUser;

    await datasetQualityPrivileges.throwIfCannotReadDataset(esClient, params.query.type);

    return await getNonAggregatableDataStreams({
      esClient,
      ...params.query,
      types: [params.query.type],
    });
  },
});

const degradedFieldsRoute = createDatasetQualityServerRoute({
  endpoint: 'GET /internal/dataset_quality/data_streams/{dataStream}/degraded_fields',
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
  async handler(resources): Promise<DegradedFieldResponse> {
    const { context, params } = resources;
    const { dataStream } = params.path;
    const coreContext = await context.core;

    const esClient = coreContext.elasticsearch.client.asCurrentUser;

    return await getDegradedFields({
      esClient,
      dataStream,
      ...params.query,
    });
  },
});

const degradedFieldValuesRoute = createDatasetQualityServerRoute({
  endpoint:
    'GET /internal/dataset_quality/data_streams/{dataStream}/degraded_field/{degradedField}/values',
  params: t.type({
    path: t.type({
      dataStream: t.string,
      degradedField: t.string,
    }),
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
  async handler(resources): Promise<DegradedFieldValues> {
    const { context, params } = resources;
    const { dataStream, degradedField } = params.path;
    const coreContext = await context.core;

    const esClient = coreContext.elasticsearch.client.asCurrentUser;

    return await getDegradedFieldValues({
      esClient,
      dataStream,
      degradedField,
    });
  },
});

const dataStreamSettingsRoute = createDatasetQualityServerRoute({
  endpoint: 'GET /internal/dataset_quality/data_streams/{dataStream}/settings',
  params: t.type({
    path: t.type({
      dataStream: t.string,
    }),
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
  async handler(resources): Promise<DataStreamSettings> {
    const { context, params } = resources;
    const { dataStream } = params.path;
    const coreContext = await context.core;

    // Query datastreams as the current user as the Kibana internal user may not have all the required permissions
    const esClient = coreContext.elasticsearch.client.asCurrentUser;

    const dataStreamSettings = await getDataStreamSettings({
      esClient,
      dataStream,
    });

    return dataStreamSettings;
  },
});

const checkAndLoadIntegrationRoute = createDatasetQualityServerRoute({
  endpoint: 'GET /internal/dataset_quality/data_streams/{dataStream}/integration/check',
  params: t.type({
    path: t.type({
      dataStream: t.string,
    }),
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
  async handler(resources): Promise<CheckAndLoadIntegrationResponse> {
    const { context, params, plugins, logger, request } = resources;
    const { dataStream } = params.path;
    const coreContext = await context.core;

    // Query dataStreams as the current user as the Kibana internal user may not have all the required permissions
    const esClient = coreContext.elasticsearch.client.asCurrentUser;

    const fleetPluginStart = await plugins.fleet.start();
    const packageClient = fleetPluginStart.packageService.asScoped(request);

    const integration = await checkAndLoadIntegration({
      esClient,
      packageClient,
      logger,
      dataStream,
    });

    return integration;
  },
});

const dataStreamDetailsRoute = createDatasetQualityServerRoute({
  endpoint: 'GET /internal/dataset_quality/data_streams/{dataStream}/details',
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
  async handler(resources): Promise<DataStreamDetails> {
    const { context, params, getEsCapabilities } = resources;
    const { dataStream } = params.path;
    const { start, end } = params.query;
    const coreContext = await context.core;

    const esClient = coreContext.elasticsearch.client;

    const isServerless = (await getEsCapabilities()).serverless;
    const dataStreamDetails = await getDataStreamDetails({
      esClient,
      dataStream,
      start,
      end,
      isServerless,
    });

    return dataStreamDetails;
  },
});

const analyzeDegradedFieldRoute = createDatasetQualityServerRoute({
  endpoint:
    'GET /internal/dataset_quality/data_streams/{dataStream}/degraded_field/{degradedField}/analyze',
  params: t.type({
    path: t.type({
      dataStream: t.string,
      degradedField: t.string,
    }),
    query: t.type({
      lastBackingIndex: t.string,
    }),
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
  async handler(resources): Promise<DegradedFieldAnalysis> {
    const { context, params } = resources;
    const coreContext = await context.core;
    const esClient = coreContext.elasticsearch.client.asCurrentUser;

    const degradedFieldAnalysis = await analyzeDegradedField({
      esClient,
      dataStream: params.path.dataStream,
      degradedField: params.path.degradedField,
      lastBackingIndex: params.query.lastBackingIndex,
    });

    return degradedFieldAnalysis;
  },
});

const updateFieldLimitRoute = createDatasetQualityServerRoute({
  endpoint: 'PUT /internal/dataset_quality/data_streams/{dataStream}/update_field_limit',
  params: t.type({
    path: t.type({
      dataStream: t.string,
    }),
    body: t.type({
      newFieldLimit: t.number,
    }),
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
  async handler(resources): Promise<UpdateFieldLimitResponse> {
    const { context, params } = resources;
    const coreContext = await context.core;
    const esClient = coreContext.elasticsearch.client.asCurrentUser;

    const updatedLimitResponse = await updateFieldLimit({
      esClient,
      newFieldLimit: params.body.newFieldLimit,
      dataStream: params.path.dataStream,
    });

    return updatedLimitResponse;
  },
});

const rolloverDataStream = createDatasetQualityServerRoute({
  endpoint: 'POST /internal/dataset_quality/data_streams/{dataStream}/rollover',
  params: t.type({
    path: t.type({
      dataStream: t.string,
    }),
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
  async handler(resources): Promise<DataStreamRolloverResponse> {
    const { context, params } = resources;
    const coreContext = await context.core;
    const esClient = coreContext.elasticsearch.client.asCurrentUser;
    const datasetQualityESClient = createDatasetQualityESClient(esClient);

    const { acknowledged } = await datasetQualityESClient.rollover({
      alias: params.path.dataStream,
    });

    return { acknowledged };
  },
});

export const dataStreamsRouteRepository = {
  ...statsRoute,
  ...degradedDocsRoute,
  ...totalDocsRoute,
  ...nonAggregatableDatasetsRoute,
  ...nonAggregatableDatasetRoute,
  ...degradedFieldsRoute,
  ...degradedFieldValuesRoute,
  ...dataStreamDetailsRoute,
  ...dataStreamSettingsRoute,
  ...checkAndLoadIntegrationRoute,
  ...analyzeDegradedFieldRoute,
  ...updateFieldLimitRoute,
  ...rolloverDataStream,
  ...failedDocsRouteRepository,
};
