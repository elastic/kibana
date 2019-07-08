/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import { FrameworkAdapter, FrameworkRequest, RequestBasicOptions } from '../framework';

import { buildDnsQuery } from './query_dns.dsl';
import { buildTlsHandshakeQuery } from './query_tls_handshakes.dsl';
import { buildUniquePrvateIpQuery } from './query_unique_private_ips.dsl';
import {
  KpiNetworkHit,
  KpiNetworkAdapter,
  KpiNetworkESMSearchBody,
  KpiNetworkGeneralHit,
  KpiNetworkUniquePrivateIpsHit,
  KpiIpDetailsHit,
} from './types';
import { TermAggregation } from '../types';
import { KpiNetworkHistogramData, KpiNetworkData, KpiIpDetailsData } from '../../graphql/types';
import { buildNetworkEventsQuery } from './query_network_events.dsl';
import { buildUniqueFlowIdsQuery } from './query_unique_flow.dsl';
import { buildTopIpsQuery } from './query_top_ips.dsl';
import { buildTransportBytesQuery } from './query_transport_bytes.dsl';
import { buildTopPortsQuery } from './query_top_ports.dsl';
import { buildTopTransportProtocolsQuery } from './query_top_transport.dsl';

const formatHistogramData = (
  data: Array<{ key: number; count: { value: number } }>
): KpiNetworkHistogramData[] | null => {
  return data && data.length > 0
    ? data.map<KpiNetworkHistogramData>(({ key, count }) => {
        return {
          x: key,
          y: getOr(null, 'value', count),
        };
      })
    : null;
};

export class ElasticsearchKpiNetworkAdapter implements KpiNetworkAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getKpiNetwork(
    request: FrameworkRequest,
    options: RequestBasicOptions
  ): Promise<KpiNetworkData> {
    const networkEventsQuery: KpiNetworkESMSearchBody[] = buildNetworkEventsQuery(options);
    const uniqueFlowIdsQuery: KpiNetworkESMSearchBody[] = buildUniqueFlowIdsQuery(options);
    const uniquePrivateIpsQuery: KpiNetworkESMSearchBody[] = buildUniquePrvateIpQuery(options);
    const dnsQuery: KpiNetworkESMSearchBody[] = buildDnsQuery(options);
    const tlsHandshakesQuery: KpiNetworkESMSearchBody[] = buildTlsHandshakeQuery(options);
    const response = await this.framework.callWithRequest<
      KpiNetworkGeneralHit | KpiNetworkHit | KpiNetworkUniquePrivateIpsHit,
      TermAggregation
    >(request, 'msearch', {
      body: [
        ...networkEventsQuery,
        ...dnsQuery,
        ...uniquePrivateIpsQuery,
        ...uniqueFlowIdsQuery,
        ...tlsHandshakesQuery,
      ],
    });
    const uniqueSourcePrivateIpsHistogram = getOr(
      null,
      'responses.2.aggregations.source.histogram.buckets',
      response
    );
    const uniqueDestinationPrivateIpsHistogram = getOr(
      null,
      'responses.2.aggregations.destination.histogram.buckets',
      response
    );

    return {
      networkEvents: getOr(null, 'responses.0.hits.total.value', response),
      dnsQueries: getOr(null, 'responses.1.hits.total.value', response),
      uniqueSourcePrivateIps: getOr(
        null,
        'responses.2.aggregations.source.unique_private_ips.value',
        response
      ),
      uniqueSourcePrivateIpsHistogram: formatHistogramData(uniqueSourcePrivateIpsHistogram),
      uniqueDestinationPrivateIps: getOr(
        null,
        'responses.2.aggregations.destination.unique_private_ips.value',
        response
      ),
      uniqueDestinationPrivateIpsHistogram: formatHistogramData(
        uniqueDestinationPrivateIpsHistogram
      ),
      uniqueFlowId: getOr(null, 'responses.3.aggregations.unique_flow_id.value', response),
      tlsHandshakes: getOr(null, 'responses.4.hits.total.value', response),
    };
  }

  public async getKpiIpDetails(
    request: FrameworkRequest,
    options: RequestBasicOptions
  ): Promise<KpiIpDetailsData> {
    const connectionsQuery: KpiNetworkESMSearchBody[] = buildNetworkEventsQuery(options);
    const transportBytesQuery: KpiNetworkESMSearchBody[] = buildTransportBytesQuery(options);
    const topIpsQuery: KpiNetworkESMSearchBody[] = buildTopIpsQuery(options);
    const topPortsQuery: KpiNetworkESMSearchBody[] = buildTopPortsQuery(options);
    const topTransportProtocolsQuery: KpiNetworkESMSearchBody[] = buildTopTransportProtocolsQuery(
      options
    );
    const response = await this.framework.callWithRequest<KpiIpDetailsHit, TermAggregation>(
      request,
      'msearch',
      {
        body: [
          ...connectionsQuery,
          ...transportBytesQuery,
          ...topIpsQuery,
          ...topPortsQuery,
          ...topTransportProtocolsQuery,
        ],
      }
    );

    const topSourceIp = getOr(null, 'responses.1.aggregations.source.buckets.0', response);
    const topDestinationIp = getOr(
      null,
      'responses.1.aggregations.destination.buckets.0',
      response
    );
    return {
      sourceByte: getOr(null, 'responses.0.aggregations.source.value', response),
      destinationByte: getOr(null, 'responses.0.aggregations.destination.value', response),
      topSourceIp: getOr(null, 'key', topSourceIp),
      topDestinationIp: getOr(null, 'key', topDestinationIp),
      topSourceIpTransportBytes: getOr(null, 'source.value', topSourceIp),
      topDestinationIpTransportBytes: getOr(null, 'destination.value', topDestinationIp),
      topDestinationPort: getOr(
        null,
        'responses.2.aggregations.destination.buckets.0.key',
        response
      ),
      topTransport: getOr(null, 'responses.3.aggregations.transport.buckets.0.key', response),
    };
  }
}
