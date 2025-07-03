/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import type { ElasticsearchClient, IScopedClusterClient } from '@kbn/core/server';
import { DataStreamDetails } from '../../../../common/api_types';
import { FAILURE_STORE_PRIVILEGE, MAX_HOSTS_METRIC_VALUE } from '../../../../common/constants';
import { _IGNORED } from '../../../../common/es_fields';
import { datasetQualityPrivileges } from '../../../services';
import { createDatasetQualityESClient } from '../../../utils';
import { rangeQuery } from '../../../utils/queries';
import { getFailedDocsPaginated } from '../failed_docs/get_failed_docs';
import { getDataStreams } from '../get_data_streams';
import { getDataStreamsMeteringStats } from '../get_data_streams_metering_stats';

export async function getDataStreamDetails({
  esClient,
  dataStream,
  start,
  end,
  isServerless,
}: {
  esClient: IScopedClusterClient;
  dataStream: string;
  start: number;
  end: number;
  isServerless: boolean;
}): Promise<DataStreamDetails> {
  throwIfInvalidDataStreamParams(dataStream);

  // Query datastreams as the current user as the Kibana internal user may not have all the required permissions
  const esClientAsCurrentUser = esClient.asCurrentUser;
  const esClientAsSecondaryAuthUser = esClient.asSecondaryAuthUser;

  const dataStreamPrivileges = (
    await datasetQualityPrivileges.getHasIndexPrivileges(
      esClientAsCurrentUser,
      [dataStream],
      ['monitor', FAILURE_STORE_PRIVILEGE]
    )
  )[dataStream];

  const esDataStream = dataStreamPrivileges.monitor
    ? (
        await getDataStreams({
          esClient: esClientAsCurrentUser,
          datasetQuery: dataStream,
        })
      ).dataStreams[0]
    : undefined;

  try {
    const dataStreamSummaryStats = await getDataStreamSummaryStats(
      esClientAsCurrentUser,
      dataStream,
      start,
      end
    );

    const failedDocs = !dataStreamPrivileges[FAILURE_STORE_PRIVILEGE]
      ? undefined
      : (
          await getFailedDocsPaginated({
            esClient: esClientAsCurrentUser,
            types: [],
            datasetQuery: dataStream,
            start,
            end,
          })
        )?.[0];

    const avgDocSizeInBytes =
      dataStreamPrivileges.monitor && dataStreamSummaryStats.docsCount > 0
        ? isServerless
          ? await getMeteringAvgDocSizeInBytes(esClientAsSecondaryAuthUser, dataStream)
          : await getAvgDocSizeInBytes(esClientAsCurrentUser, dataStream)
        : 0;

    const sizeBytes = Math.ceil(avgDocSizeInBytes * dataStreamSummaryStats.docsCount);

    return {
      ...dataStreamSummaryStats,
      failedDocsCount: failedDocs?.count,
      sizeBytes,
      hasFailureStore: esDataStream?.hasFailureStore,
      lastActivity: esDataStream?.lastActivity,
      userPrivileges: {
        canMonitor: dataStreamPrivileges.monitor,
        canReadFailureStore: dataStreamPrivileges[FAILURE_STORE_PRIVILEGE],
      },
    };
  } catch (e) {
    // Respond with empty object if data stream does not exist
    if (e.statusCode === 404) {
      return {};
    }
    throw e;
  }
}

type TermAggregation = Record<string, { terms: { field: string; size: number } }>;

const MAX_HOSTS = MAX_HOSTS_METRIC_VALUE + 1; // Adding 1 so that we can show e.g. '50+'

// Gather service.name terms
const serviceNamesAgg: TermAggregation = {
  ['service.name']: { terms: { field: 'service.name', size: MAX_HOSTS } },
};

const entityFields = [
  'host.name',
  'container.id',
  'kubernetes.pod.uid',
  'cloud.instance.id',
  'aws.s3.bucket.name',
  'aws.rds.db_instance.arn',
  'aws.sqs.queue.name',
];

// Gather host terms like 'host', 'pod', 'container'
const hostsAgg: TermAggregation = entityFields.reduce(
  (acc, idField) => ({ ...acc, [idField]: { terms: { field: idField, size: MAX_HOSTS } } }),
  {} as TermAggregation
);

async function getDataStreamSummaryStats(
  esClient: ElasticsearchClient,
  dataStream: string,
  start: number,
  end: number
): Promise<{
  docsCount: number;
  degradedDocsCount: number;
  services: Record<string, string[]>;
  hosts: Record<string, string[]>;
}> {
  const datasetQualityESClient = createDatasetQualityESClient(esClient);

  const response = await datasetQualityESClient.search({
    index: dataStream,
    query: rangeQuery(start, end)[0],
    size: 0,
    aggs: {
      total_count: {
        value_count: { field: '_index' },
      },
      degraded_count: {
        filter: { exists: { field: _IGNORED } },
      },
      ...serviceNamesAgg,
      ...hostsAgg,
    },
  });

  const docsCount = Number(response.aggregations?.total_count.value ?? 0);
  const degradedDocsCount = Number(response.aggregations?.degraded_count.doc_count ?? 0);

  return {
    docsCount,
    degradedDocsCount,
    services: getTermsFromAgg(serviceNamesAgg, response.aggregations),
    hosts: getTermsFromAgg(hostsAgg, response.aggregations),
  };
}

async function getMeteringAvgDocSizeInBytes(esClient: ElasticsearchClient, index: string) {
  const meteringStats = await getDataStreamsMeteringStats({
    esClient,
    dataStreams: [index],
  });

  const docCount = meteringStats[index].totalDocs ?? 0;
  const sizeInBytes = meteringStats[index].sizeBytes ?? 0;

  return docCount ? sizeInBytes / docCount : 0;
}

async function getAvgDocSizeInBytes(esClient: ElasticsearchClient, index: string) {
  const indexStats = await esClient.indices.stats({ index });
  const docCount = indexStats._all.total?.docs?.count ?? 0;
  const sizeInBytes = indexStats._all.total?.store?.size_in_bytes ?? 0;

  return docCount ? sizeInBytes / docCount : 0;
}

function getTermsFromAgg(termAgg: TermAggregation, aggregations: any) {
  return Object.entries(termAgg).reduce((acc, [key, _value]) => {
    const values = aggregations[key]?.buckets.map((bucket: any) => bucket.key) as string[];
    return { ...acc, [key]: values };
  }, {});
}

function throwIfInvalidDataStreamParams(dataStream?: string) {
  if (!dataStream?.trim()) {
    throw badRequest(`Data Stream name cannot be empty. Received value "${dataStream}"`);
  }
}
