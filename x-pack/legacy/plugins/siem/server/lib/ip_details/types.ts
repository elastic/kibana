/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TlsData, IpOverviewData, UsersData } from '../../graphql/types';
import { FrameworkRequest, RequestBasicOptions } from '../framework';
import { Hit, ShardsResponse, TotalValue } from '../types';

export interface IpDetailsAdapter {
  getIpDetails(request: FrameworkRequest, options: RequestBasicOptions): Promise<IpOverviewData>;
  getTls(request: FrameworkRequest, options: RequestBasicOptions): Promise<TlsData>;
  getUsers(request: FrameworkRequest, options: RequestBasicOptions): Promise<UsersData>;
}

interface ResultHit<T> {
  doc_count: number;
  results: {
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

export interface OverviewHit {
  took?: number;
  timed_out?: boolean;
  _scroll_id?: string;
  _shards?: ShardsResponse;
  timeout?: number;
  hits?: {
    total: number;
    hits: Hit[];
  };
  doc_count: number;
  geo: ResultHit<object>;
  autonomousSystem: ResultHit<object>;
  firstSeen: {
    value: number;
    value_as_string: string;
  };
  lastSeen: {
    value: number;
    value_as_string: string;
  };
}

export type OverviewHostHit = ResultHit<object>;

export interface IpOverviewHit {
  aggregations: {
    destination?: OverviewHit;
    source?: OverviewHit;
    host: ResultHit<object>;
  };
  _shards: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  hits: {
    total: {
      value: number;
      relation: string;
    };
    max_score: number | null;
    hits: [];
  };
  took: number;
  timeout: number;
}

export interface TlsBuckets {
  key: string;
  timestamp?: {
    value: number;
    value_as_string: string;
  };

  alternative_names: {
    buckets: Readonly<Array<{ key: string; doc_count: number }>>;
  };

  common_names: {
    buckets: Readonly<Array<{ key: string; doc_count: number }>>;
  };

  ja3: {
    buckets: Readonly<Array<{ key: string; doc_count: number }>>;
  };

  issuer_names: {
    buckets: Readonly<Array<{ key: string; doc_count: number }>>;
  };

  not_after: {
    buckets: Readonly<Array<{ key: number; key_as_string: string; doc_count: number }>>;
  };
}

// Users Table

export interface UsersResponse {
  took: number;
  timed_out: boolean;
  _shards: UsersShards;
  hits: UsersHits;
  aggregations: Aggregations;
}
interface UsersShards {
  total: number;
  successful: number;
  skipped: number;
  failed: number;
}
interface UsersHits {
  max_score: null;
  hits: string[];
}
interface Aggregations {
  user_count: UserCount;
  users: Users;
}
interface UserCount {
  value: number;
}
interface Users {
  doc_count_error_upper_bound: number;
  sum_other_doc_count: number;
  buckets: UsersBucketsItem[];
}
export interface UsersBucketsItem {
  key: string;
  doc_count: number;
  groupName?: UsersGroupName;
  groupId?: UsersGroupId;
  id?: Id;
}
export interface UsersGroupName {
  doc_count_error_upper_bound: number;
  sum_other_doc_count: number;
  buckets: UsersBucketsItem[];
}
export interface UsersGroupId {
  doc_count_error_upper_bound: number;
  sum_other_doc_count: number;
  buckets: UsersBucketsItem[];
}
interface Id {
  doc_count_error_upper_bound: number;
  sum_other_doc_count: number;
  buckets: UsersBucketsItem[];
}
