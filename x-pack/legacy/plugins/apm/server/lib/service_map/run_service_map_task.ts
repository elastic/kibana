/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq } from 'lodash';
import { ESClient } from '../helpers/es_client';
import { getNextTransactionSamples } from './get_next_transaction_samples';
import { getServiceConnections } from './get_service_connections';
import { mapTraceToBulkServiceConnection } from './map_trace_to_bulk_service_connection';
import { ENVIRONMENT_NOT_DEFINED } from '../../../common/environment_filter_values';
import { ApmIndicesConfig } from '../settings/apm_indices/get_apm_indices';
import {
  SPAN_TYPE,
  SPAN_SUBTYPE,
  SPAN_ID,
  TIMESTAMP,
  TRANSACTION_ID,
  PARENT_ID,
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  DESTINATION_ADDRESS
} from '../../../common/elasticsearch_fieldnames';
import { Setup } from '../helpers/setup_request';

interface MappedDocument {
  [TIMESTAMP]: string;
  [TRANSACTION_ID]: string;
  [PARENT_ID]?: string;
  [SPAN_ID]?: string;
  [SPAN_TYPE]: string;
  [SPAN_SUBTYPE]?: string;
  [SERVICE_NAME]: string;
  [SERVICE_ENVIRONMENT]?: string;
  [DESTINATION_ADDRESS]: string;
}

export interface TraceConnection {
  caller: MappedDocument;
  callee?: MappedDocument;
  upstream: string[]; // [`${service_name}/${environment}`]
}

async function indexLatestConnections(
  apmIndices: ApmIndicesConfig,
  esClient: ESClient,
  internalEsClient: ESClient,
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
          `${serviceConnection.caller[SERVICE_NAME]}/${serviceConnection.caller[
            SERVICE_ENVIRONMENT
          ] || ENVIRONMENT_NOT_DEFINED}`
      )
    );
    return traceConnections.flatMap(
      mapTraceToBulkServiceConnection(apmIndices, servicesInTrace)
    );
  });
  if (bulkIndexConnectionDocs.length > 0) {
    await internalEsClient.bulk({
      body: bulkIndexConnectionDocs
        .map(bulkObject => JSON.stringify(bulkObject))
        .join('\n')
    });
  }
  return await indexLatestConnections(
    apmIndices,
    esClient,
    internalEsClient,
    startTimeInterval,
    nextLatestTransactionTime,
    nextAfterKey
  );
}

export async function runServiceMapTask(
  setup: Setup,
  startTimeInterval?: string | number
) {
  return await indexLatestConnections(
    setup.indices,
    setup.client,
    setup.internalClient,
    startTimeInterval
  );
}
