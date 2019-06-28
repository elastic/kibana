/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import { FrameworkAdapter, FrameworkRequest, RequestBasicOptions } from '../framework';

import { buildDnsQuery } from './query_dns.dsl';
import { buildGeneralQuery } from './query_general.dsl';
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
    const generalQuery: KpiNetworkESMSearchBody[] = buildGeneralQuery(options);
    const uniqueSourcePrivateIpsQuery: KpiNetworkESMSearchBody[] = buildUniquePrvateIpQuery(
      'source',
      options
    );
    const uniqueDestinationPrivateIpsQuery: KpiNetworkESMSearchBody[] = buildUniquePrvateIpQuery(
      'destination',
      options
    );
    const dnsQuery: KpiNetworkESMSearchBody[] = buildDnsQuery(options);
    const tlsHandshakesQuery: KpiNetworkESMSearchBody[] = buildTlsHandshakeQuery(options);
    const response = await this.framework.callWithRequest<
      KpiNetworkGeneralHit | KpiNetworkHit | KpiNetworkUniquePrivateIpsHit,
      TermAggregation
    >(request, 'msearch', {
      body: [
        ...generalQuery,
        ...uniqueSourcePrivateIpsQuery,
        ...uniqueDestinationPrivateIpsQuery,
        ...dnsQuery,
        ...tlsHandshakesQuery,
      ],
    });
    const uniqueSourcePrivateIpsHistogram = getOr(
      null,
      'responses.1.aggregations.histogram.buckets',
      response
    );
    const uniqueDestinationPrivateIpsHistogram = getOr(
      null,
      'responses.2.aggregations.histogram.buckets',
      response
    );

    return {
      networkEvents: getOr(null, 'responses.0.hits.total.value', response),
      uniqueFlowId: getOr(null, 'responses.0.aggregations.unique_flow_id.value', response),
      uniqueSourcePrivateIps: getOr(
        null,
        'responses.1.aggregations.unique_private_ips.value',
        response
      ),
      uniqueSourcePrivateIpsHistogram: formatHistogramData(uniqueSourcePrivateIpsHistogram),
      uniqueDestinationPrivateIps: getOr(
        null,
        'responses.2.aggregations.unique_private_ips.value',
        response
      ),
      uniqueDestinationPrivateIpsHistogram: formatHistogramData(
        uniqueDestinationPrivateIpsHistogram
      ),
      dnsQueries: getOr(null, 'responses.3.hits.total.value', response),
      tlsHandshakes: getOr(null, 'responses.4.hits.total.value', response),
    };
  }

  public async getKpiIpDetails(
    request: FrameworkRequest,
    options: RequestBasicOptions
  ): Promise<KpiIpDetailsData> {
    const generalQuery: KpiNetworkESMSearchBody[] = buildGeneralQuery(options);
    const response = await this.framework.callWithRequest<KpiIpDetailsHit, TermAggregation>(
      request,
      'msearch',
      {
        body: [...generalQuery],
      }
    );

    const sourcePacketsHistogram = getOr(
      null,
      'responses.0.aggregations.source.packetsHistogram.buckets',
      response
    );
    const destinationPacketsHistogram = getOr(
      null,
      'responses.0.aggregations.destination.packetsHistogram.buckets',
      response
    );
    const sourceByteHistogram = getOr(
      null,
      'responses.0.aggregations.source.bytesHistogram.buckets',
      response
    );
    const destinationByteHistogram = getOr(
      null,
      'responses.0.aggregations.destination.bytesHistogram.buckets',
      response
    );

    return {
      connections: getOr(null, 'responses.0.aggregations.connections.value', response),
      hosts: getOr(null, 'responses.0.aggregations.destination.hosts.value', response),
      sourcePackets: getOr(null, 'responses.0.aggregations.source.packets.value', response),
      sourcePacketsHistogram: formatHistogramData(sourcePacketsHistogram),
      destinationPackets: getOr(
        null,
        'responses.0.aggregations.destination.packets.value',
        response
      ),
      destinationPacketsHistogram: formatHistogramData(destinationPacketsHistogram),
      sourceByte: getOr(null, 'responses.0.aggregations.source.bytes.value', response),
      sourceByteHistogram: formatHistogramData(sourceByteHistogram),
      destinationByte: getOr(null, 'responses.0.aggregations.destination.bytes.value', response),
      destinationByteHistogram: formatHistogramData(destinationByteHistogram),
    };
  }
}
