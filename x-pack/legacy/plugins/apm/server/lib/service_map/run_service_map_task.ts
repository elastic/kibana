/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { uniq } from 'lodash';
import { APMPluginContract } from '../../../../../../plugins/apm/server/plugin';
import { getESClient, ESClient } from '../helpers/es_client';
import { Span } from '../../../typings/es_schemas/ui/Span';
import { getNextTransactionSamples } from './get_next_transaction_samples';
import { getServiceConnections } from './get_service_connections';
import { mapTraceToBulkServiceConnection } from './map_trace_to_bulk_service_connection';
import { ENVIRONMENT_NOT_DEFINED } from '../../../common/environment_filter_values';
import { getInternalSavedObjectsClient } from '../helpers/saved_objects_client';
import { ApmIndicesConfig } from '../settings/apm_indices/get_apm_indices';

interface MappedDocument {
  transaction?: boolean;
  id: string; // span or transaction id
  parent?: string; // parent.id
  environment?: string; // service.environment
  destination?: string; // destination.address
  span_type?: Span['span']['type'];
  span_subtype?: Span['span']['subtype'];
  timestamp: string;
  service_name: Span['service']['name'];
}

export interface TraceConnection {
  caller: MappedDocument;
  callee?: MappedDocument;
  upstream: string[]; // [`${service_name}/${environment}`]
}

async function indexLatestConnections(
  apmIndices: ApmIndicesConfig,
  esClient: ESClient,
  startTimeInterval?: string | number,
  latestTransactionTime = 0,
  afterKey?: object
): Promise<{ latestTransactionTime: number }> {
  const targetApmIndices = [
    apmIndices['apm_oss.transactionIndices'],
    apmIndices['apm_oss.spanIndices']
  ];
  const {
    after_key: nextAfterKey,
    latestTransactionTime: latestSampleTransactionTime,
    traceIds
  } = await getNextTransactionSamples({
    targetApmIndices,
    startTimeInterval: startTimeInterval || 'now-1h',
    afterKey,
    esClient
  });
  if (traceIds.length === 0) {
    return { latestTransactionTime };
  }
  const nextLatestTransactionTime = Math.max(
    latestTransactionTime,
    latestSampleTransactionTime
  );
  const traceConnectionsBuckets = await getServiceConnections({
    targetApmIndices,
    traceIds,
    esClient
  });
  const bulkIndexConnectionDocs = traceConnectionsBuckets.flatMap(bucket => {
    const traceConnections = bucket.connections.value as TraceConnection[];
    const servicesInTrace = uniq(
      traceConnections.map(
        serviceConnection =>
          `${serviceConnection.caller.service_name}/${serviceConnection.caller
            .environment || ENVIRONMENT_NOT_DEFINED}`
      )
    );
    return traceConnections.flatMap(
      mapTraceToBulkServiceConnection(apmIndices, servicesInTrace)
    );
  });
  await esClient.bulk({
    body: bulkIndexConnectionDocs
      .map(bulkObject => JSON.stringify(bulkObject))
      .join('\n')
  });
  return await indexLatestConnections(
    apmIndices,
    esClient,
    startTimeInterval,
    nextLatestTransactionTime,
    nextAfterKey
  );
}

export async function runServiceMapTask(
  server: Server,
  startTimeInterval?: string | number
) {
  const callCluster = server.plugins.elasticsearch.getCluster('data')
    .callWithInternalUser;
  const apmPlugin = server.newPlatform.setup.plugins.apm as APMPluginContract;
  const savedObjectsClient = getInternalSavedObjectsClient(server);
  const apmIndices = await apmPlugin.getApmIndices(savedObjectsClient);
  const esClient: ESClient = getESClient(
    apmIndices,
    server.uiSettingsServiceFactory({ savedObjectsClient }),
    callCluster
  );

  return await indexLatestConnections(apmIndices, esClient, startTimeInterval);
}
