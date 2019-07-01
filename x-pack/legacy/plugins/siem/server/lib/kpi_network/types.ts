/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FrameworkRequest, RequestBasicOptions } from '../framework';
import { MSearchHeader, SearchHit } from '../types';
import { KpiNetworkHistogramData, KpiNetworkData } from '../../graphql/types';

export interface KpiNetworkAdapter {
  getKpiNetwork(request: FrameworkRequest, options: RequestBasicOptions): Promise<KpiNetworkData>;
}

export interface KpiNetworkHit {
  hits: {
    total: {
      value: number;
    };
  };
}

export interface KpiNetworkGeneralHit extends SearchHit, KpiNetworkHit {
  aggregations: {
    unique_flow_id: {
      value: number;
    };
  };
}

export interface KpiNetworkUniquePrivateIpsHit extends SearchHit {
  aggregations: {
    unique_private_ips: {
      value: number;
    };
    histogram: {
      buckets: [KpiNetworkHistogramData];
    };
  };
}

export interface KpiNetworkBody {
  query?: object;
  aggregations?: object;
  size?: number;
  track_total_hits?: boolean;
}

export type KpiNetworkESMSearchBody = KpiNetworkBody | MSearchHeader;

export type UniquePrivateAttributeQuery = 'source' | 'destination';

// export interface KpiNetworkHistogram {
//   x: string | null | undefined;
//   y: number | null | undefined;
// }
