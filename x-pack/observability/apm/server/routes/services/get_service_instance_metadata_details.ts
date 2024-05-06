/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { merge } from 'lodash';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  METRICSET_NAME,
  SERVICE_NAME,
  SERVICE_NODE_NAME,
} from '../../../common/es_fields/apm';
import { maybe } from '../../../common/utils/maybe';
import {
  getBackwardCompatibleDocumentTypeFilter,
  getProcessorEventForTransactions,
} from '../../lib/helpers/transactions';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { Agent } from '../../../typings/es_schemas/ui/fields/agent';
import { Service } from '../../../typings/es_schemas/raw/fields/service';
import { Container } from '../../../typings/es_schemas/raw/fields/container';
import { Kubernetes } from '../../../typings/es_schemas/raw/fields/kubernetes';
import { Host } from '../../../typings/es_schemas/raw/fields/host';
import { Cloud } from '../../../typings/es_schemas/raw/fields/cloud';

export interface ServiceInstanceMetadataDetailsResponse {
  '@timestamp': string;
  agent?: Agent;
  service?: Service;
  container?: Container;
  kubernetes?: Kubernetes;
  host?: Host;
  cloud?: Cloud;
}

export async function getServiceInstanceMetadataDetails({
  serviceName,
  serviceNodeName,
  apmEventClient,
  start,
  end,
}: {
  serviceName: string;
  serviceNodeName: string;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
}): Promise<ServiceInstanceMetadataDetailsResponse> {
  const filter = [
    { term: { [SERVICE_NAME]: serviceName } },
    { term: { [SERVICE_NODE_NAME]: serviceNodeName } },
    ...rangeQuery(start, end),
  ];

  async function getApplicationMetricSample() {
    const response = await apmEventClient.search(
      'get_service_instance_metadata_details_application_metric',
      {
        apm: {
          events: [ProcessorEvent.metric],
        },
        body: {
          track_total_hits: false,
          terminate_after: 1,
          size: 1,
          query: {
            bool: {
              filter: filter.concat({ term: { [METRICSET_NAME]: 'app' } }),
            },
          },
        },
      }
    );

    return maybe(response.hits.hits[0]?._source);
  }

  async function getTransactionEventSample() {
    const response = await apmEventClient.search(
      'get_service_instance_metadata_details_application_transaction_event',
      {
        apm: {
          events: [ProcessorEvent.transaction],
        },
        body: {
          track_total_hits: false,
          terminate_after: 1,
          size: 1,
          query: { bool: { filter } },
        },
      }
    );

    return maybe(response.hits.hits[0]?._source);
  }

  async function getTransactionMetricSample() {
    const response = await apmEventClient.search(
      'get_service_instance_metadata_details_application_transaction_metric',
      {
        apm: {
          events: [getProcessorEventForTransactions(true)],
        },
        body: {
          track_total_hits: false,
          terminate_after: 1,
          size: 1,
          query: {
            bool: {
              filter: filter.concat(
                getBackwardCompatibleDocumentTypeFilter(true)
              ),
            },
          },
        },
      }
    );
    return maybe(response.hits.hits[0]?._source);
  }

  // we can expect the most detail of application metrics,
  // followed by transaction events, and then finally transaction metrics
  const [
    applicationMetricSample,
    transactionEventSample,
    transactionMetricSample,
  ] = await Promise.all([
    getApplicationMetricSample(),
    getTransactionEventSample(),
    getTransactionMetricSample(),
  ]);

  const sample = merge(
    {},
    transactionMetricSample,
    transactionEventSample,
    applicationMetricSample
  );

  const { agent, service, container, kubernetes, host, cloud } = sample;

  return {
    '@timestamp': sample['@timestamp'],
    agent,
    service,
    container,
    kubernetes,
    host,
    cloud,
  };
}
