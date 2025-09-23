/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  FAILURE_STORE_PRIVILEGE,
  MANAGE_FAILURE_STORE_PRIVILEGE,
} from '../../../../common/constants';
import { streamPartsToIndexPattern } from '../../../../common/utils';
import type { DataStreamType } from '../../../../common/types';
import { dataStreamService, datasetQualityPrivileges } from '../../../services';

export async function getDataStreams(options: {
  esClient: ElasticsearchClient;
  types?: DataStreamType[];
  datasetQuery?: string;
  uncategorisedOnly?: boolean;
}) {
  const { esClient, types = [], datasetQuery, uncategorisedOnly } = options;

  const datasetNames = datasetQuery
    ? [datasetQuery]
    : types.map((type) =>
        streamPartsToIndexPattern({
          typePattern: type,
          datasetPattern: '*-*',
        })
      );

  const datasetUserPrivileges = await datasetQualityPrivileges.getDatasetPrivileges(
    esClient,
    datasetNames
  );

  const canMonitor = Object.values(datasetUserPrivileges.datasetsPrivilages).some(
    (privileges) => privileges.canMonitor
  );

  if (!canMonitor) {
    return {
      dataStreams: [],
      datasetUserPrivileges,
    };
  }

  const allDataStreams = await dataStreamService.getMatchingDataStreams(
    esClient,
    datasetNames.join(',')
  );

  const filteredDataStreams = uncategorisedOnly
    ? allDataStreams.filter((stream) => {
        return !stream._meta || !stream._meta.managed_by || stream._meta.managed_by !== 'fleet';
      })
    : allDataStreams;

  const dataStreamsPrivileges = filteredDataStreams.length
    ? await datasetQualityPrivileges.getHasIndexPrivileges(
        esClient,
        filteredDataStreams.map(({ name }) => name),
        ['monitor', FAILURE_STORE_PRIVILEGE, MANAGE_FAILURE_STORE_PRIVILEGE]
      )
    : {};

  const mappedDataStreams = filteredDataStreams.map((dataStream) => ({
    name: dataStream.name,
    integration: dataStream._meta?.package?.name,
    // @ts-expect-error
    lastActivity: dataStream.maximum_timestamp,
    userPrivileges: {
      canMonitor: dataStreamsPrivileges[dataStream.name].monitor,
      canReadFailureStore: dataStreamsPrivileges[dataStream.name][FAILURE_STORE_PRIVILEGE],
      canManageFailureStore: dataStreamsPrivileges[dataStream.name][MANAGE_FAILURE_STORE_PRIVILEGE],
    },
    hasFailureStore: dataStream.failure_store?.enabled,
    // @ts-expect-error
    customRetentionPeriod: dataStream.failure_store?.lifecycle?.data_retention,
  }));

  return {
    dataStreams: mappedDataStreams,
    datasetUserPrivileges,
  };
}

export async function getDatasetTypesPrivileges(options: {
  esClient: ElasticsearchClient;
  types: DataStreamType[];
}) {
  const { esClient, types } = options;

  const datasetNames = types.map((type) =>
    streamPartsToIndexPattern({
      typePattern: type,
      datasetPattern: '*-*',
    })
  );

  const { datasetsPrivilages } = await datasetQualityPrivileges.getDatasetPrivileges(
    esClient,
    datasetNames
  );

  return {
    datasetsPrivilages,
  };
}
