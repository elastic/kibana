/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FirstLastSeenHost,
  HostEcsFields,
  HostItem,
  HostsData,
  HostsSortField,
  Maybe,
  OsEcsFields,
  SourceConfiguration,
  TimerangeInput,
} from '../../graphql/types';
import { FrameworkRequest, RequestOptionsPaginated } from '../framework';
import { Hit, Hits, SearchHit, TotalValue } from '../types';

export interface HostsAdapter {
  getHosts(req: FrameworkRequest, options: HostsRequestOptions): Promise<HostsData>;
  getHostOverview(req: FrameworkRequest, options: HostOverviewRequestOptions): Promise<HostItem>;
  getHostFirstLastSeen(
    req: FrameworkRequest,
    options: HostLastFirstSeenRequestOptions
  ): Promise<FirstLastSeenHost>;
}

type StringOrNumber = string | number;

export interface HostHit extends Hit {
  _source: {
    '@timestamp'?: string;
    host: HostEcsFields;
  };
  cursor?: string;
  firstSeen?: string;
  sort?: StringOrNumber[];
}

export type HostHits = Hits<number, HostHit>;

export interface HostsRequestOptions extends RequestOptionsPaginated {
  sort: HostsSortField;
  defaultIndex: string[];
}

export interface HostLastFirstSeenRequestOptions {
  hostName: string;
  sourceConfiguration: SourceConfiguration;
  defaultIndex: string[];
}

export interface HostOverviewRequestOptions extends HostLastFirstSeenRequestOptions {
  fields: string[];
  timerange: TimerangeInput;
  defaultIndex: string[];
}

export interface HostValue {
  value: number;
  value_as_string: string;
}

export interface HostBucketItem {
  key: string;
  doc_count: number;
  timestamp: HostValue;
}

export interface HostBuckets {
  buckets: HostBucketItem[];
}

export interface HostOsHitsItem {
  hits: {
    total: TotalValue | number;
    max_score: number | null;
    hits: Array<{
      _source: { host: { os: Maybe<OsEcsFields> } };
      sort?: [number];
      _index?: string;
      _type?: string;
      _id?: string;
      _score?: number | null;
    }>;
  };
}

export interface HostAggEsItem {
  cloud_instance_id?: HostBuckets;
  cloud_machine_type?: HostBuckets;
  cloud_provider?: HostBuckets;
  cloud_region?: HostBuckets;
  firstSeen?: HostValue;
  host_architecture?: HostBuckets;
  host_id?: HostBuckets;
  host_ip?: HostBuckets;
  host_mac?: HostBuckets;
  host_name?: HostBuckets;
  host_os_name?: HostBuckets;
  host_os_version?: HostBuckets;
  host_type?: HostBuckets;
  key?: string;
  lastSeen?: HostValue;
  os?: HostOsHitsItem;
}

export interface HostEsData extends SearchHit {
  sort: string[];
  aggregations: {
    host_count: {
      value: number;
    };
    host_data: {
      buckets: HostAggEsItem[];
    };
  };
}

export interface HostAggEsData extends SearchHit {
  sort: string[];
  aggregations: HostAggEsItem;
}
