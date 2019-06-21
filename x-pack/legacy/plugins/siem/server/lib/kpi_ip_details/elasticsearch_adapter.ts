/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import { KpiIpDetailsData, KpiIpDetailsHistogramData } from '../../graphql/types';
import { FrameworkAdapter, FrameworkRequest, RequestBasicOptions } from '../framework';
import { TermAggregation } from '../types';

import { buildGeneralQuery } from './query_general.dsl';

import { KpiIpDetailsAdapter, KpiIpDetailsHit, KpiIpDetailsESMSearchBody } from './types';

export interface KpiIpDetailsRequestOptions extends RequestBasicOptions {
  ip: string;
}

const formatHistogramData = (
  data: Array<{ key: number; count: { value: number } }>
): KpiIpDetailsHistogramData[] | null => {
  return data && data.length > 0
    ? data.map<KpiIpDetailsHistogramData>(({ key, count }) => {
        return {
          x: key,
          y: getOr(null, 'value', count),
        };
      })
    : null;
};

const getConnections = (sourceConnection: number | null, destinationConnection: number | null) => {
  if (sourceConnection != null && destinationConnection !== null)
    return sourceConnection + destinationConnection;
  else if (sourceConnection === null || destinationConnection !== null) {
    return destinationConnection;
  } else if (sourceConnection !== null || destinationConnection === null) {
    return sourceConnection;
  } else {
    return null;
  }
};

export class ElasticsearchKpiIpDetailsAdapter implements KpiIpDetailsAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getKpiIpDetails(
    request: FrameworkRequest,
    options: KpiIpDetailsRequestOptions
  ): Promise<KpiIpDetailsData> {
    const generalQuery: KpiIpDetailsESMSearchBody[] = buildGeneralQuery(options);
    const response = await this.framework.callWithRequest<KpiIpDetailsHit, TermAggregation>(
      request,
      'msearch',
      {
        body: [...generalQuery],
      }
    );
    const sourceConnection = getOr(null, 'responses.0.aggregations.source.doc_count', response);
    const destinationConnection = getOr(
      null,
      'responses.0.aggregations.destination.doc_count',
      response
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
      connections: getConnections(sourceConnection, destinationConnection),
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
