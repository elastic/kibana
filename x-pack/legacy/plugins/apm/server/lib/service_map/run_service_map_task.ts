/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { uniq } from 'lodash';
import { BulkIndexDocumentsParams } from 'elasticsearch';
import { getSearchClient, SearchClient } from '../helpers/es_client';
import { Span } from '../../../typings/es_schemas/ui/Span';
import { getNextTransactionSamples } from './get_next_transaction_samples';
import { getServiceConnections } from './get_service_connections';
import { mapTraceToBulkServiceConnection } from './map_trace_to_bulk_service_connection';
import { ENVIRONMENT_NOT_DEFINED } from '../../../common/environment_filter_values';

interface MappedDocument {
  transaction?: boolean;
  id: string; // span or transaction id
  parent?: string; // parent.id
  environment?: string; // service.environment
  destination?: string; // destination.address
  _index?: string; // _index // TODO should this be required?
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
  config: ReturnType<Server['config']>,
  searchClient: SearchClient,
  bulkClient: (params: BulkIndexDocumentsParams) => Promise<any>,
  startTimeInterval?: string | number,
  latestTransactionTime = 0,
  afterKey?: object
): Promise<{ latestTransactionTime: number }> {
  const targetApmIndices = [
    config.get<string>('apm_oss.transactionIndices'),
    config.get<string>('apm_oss.spanIndices')
  ];
  const serviceConnsDestinationIndex = config.get<string>(
    'xpack.apm.serviceMapDestinationIndex'
  );
  const serviceConnsDestinationPipeline = config.get<string>(
    'xpack.apm.serviceMapDestinationPipeline'
  );
  const {
    after_key: nextAfterKey,
    latestTransactionTime: latestSampleTransactionTime,
    traceIds
  } = await getNextTransactionSamples({
    targetApmIndices,
    startTimeInterval: startTimeInterval || 'now-1h',
    afterKey,
    searchClient
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
    searchClient
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
      mapTraceToBulkServiceConnection({
        serviceConnsDestinationIndex,
        serviceConnsDestinationPipeline,
        servicesInTrace
      })
    );
  });
  await bulkClient({
    body: bulkIndexConnectionDocs
      .map(bulkObject => JSON.stringify(bulkObject))
      .join('\n')
  });
  return await indexLatestConnections(
    config,
    searchClient,
    bulkClient,
    startTimeInterval,
    nextLatestTransactionTime,
    nextAfterKey
  );
}

export async function runServiceMapTask(
  server: Server,
  config: ReturnType<Server['config']>,
  startTimeInterval?: string | number
) {
  const callCluster = server.plugins.elasticsearch.getCluster('data')
    .callWithInternalUser;
  const searchClient = getSearchClient(callCluster);
  const bulkClient = (params: BulkIndexDocumentsParams) =>
    callCluster('bulk', params);

  return await indexLatestConnections(
    config,
    searchClient,
    bulkClient,
    startTimeInterval
  );
}
