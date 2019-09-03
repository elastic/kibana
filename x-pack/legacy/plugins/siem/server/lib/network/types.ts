/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NetworkDnsData, NetworkTopNFlowData } from '../../graphql/types';
import { FrameworkRequest, RequestOptionsPaginated } from '../framework';
import { SearchHit, TotalValue } from '../types';

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

interface LocationHit<T> {
  doc_count: number;
  top_geo: {
    hits: {
      total: TotalValue | number;
      max_score: number | null;
      hits: Array<{
        _source: T;
        sort?: [number];
        _index?: string;
        _type?: string;
        _id?: string;
        _score?: number | null;
      }>;
    };
  };
}

interface AutonomousSystemHit<T> {
  doc_count: number;
  top_as: {
    hits: {
      total: TotalValue | number;
      max_score: number | null;
      hits: Array<{
        _source: T;
        sort?: [number];
        _index?: string;
        _type?: string;
        _id?: string;
        _score?: number | null;
      }>;
    };
  };
}

export interface NetworkTopNFlowBuckets {
  key: string;
  autonomous_system: AutonomousSystemHit<object>;
  bytes_in: {
    value: number;
  };
  bytes_out: {
    value: number;
  };
  domain: {
    buckets: GenericBuckets[];
  };
  location: LocationHit<object>;
  flows: number;
  destination_ips?: number;
  source_ips?: number;
}

export interface NetworkTopNFlowData extends SearchHit {
  aggregations: {
    top_n_flow_count?: {
      value: number;
    };
    destination?: {
      buckets: NetworkTopNFlowBuckets[];
    };
    source?: {
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
