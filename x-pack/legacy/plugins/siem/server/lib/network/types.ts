/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FlowTarget,
  NetworkDirectionEcs,
  NetworkDnsData,
  NetworkTopNFlowData,
} from '../../graphql/types';
import { FrameworkRequest, RequestOptionsPaginated } from '../framework';
import { SearchHit } from '../types';

export interface NetworkAdapter {
  getNetworkTopNFlow(
    req: FrameworkRequest,
    options: RequestOptionsPaginated
  ): Promise<NetworkTopNFlowData>;
  getNetworkDns(req: FrameworkRequest, options: RequestOptionsPaginated): Promise<NetworkDnsData>;
}

export interface GenericBuckets {
  key: string;
  doc_count: number;
}

export interface DirectionBuckets {
  key: NetworkDirectionEcs;
}

export interface NetworkTopNFlowBuckets {
  key: string;
  bytes_in: {
    value: number;
  };
  bytes_out: {
    value: number;
  };
  // location: {
  //   value: string;
  // };
  domain: {
    buckets: GenericBuckets[];
  };
  // autonomous_system: {
  //   value: string;
  // };
}

export interface NetworkTopNFlowData extends SearchHit {
  aggregations: {
    top_n_flow_count?: {
      value: number;
    };
    [FlowTarget.source]?: {
      buckets: NetworkTopNFlowBuckets[];
    };
    [FlowTarget.destination]?: {
      buckets: NetworkTopNFlowBuckets[];
    };
  };
}

export interface NetworkDnsBuckets {
  key: string;
  doc_count: number;
  unique_domains: {
    value: number;
  };
  dns_bytes_in: {
    value: number;
  };
  dns_bytes_out: {
    value: number;
  };
}

export interface NetworkDnsData extends SearchHit {
  aggregations: {
    dns_count?: {
      value: number;
    };
    dns_name_query_count?: {
      buckets: NetworkDnsBuckets[];
    };
  };
}
