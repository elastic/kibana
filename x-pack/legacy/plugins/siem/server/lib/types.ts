/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Anomalies } from './anomalies';
import { Authentications } from './authentications';
import { ConfigurationAdapter } from './configuration';
import { Events } from './events';
import { FrameworkAdapter, FrameworkRequest } from './framework';
import { Hosts } from './hosts';
import { IndexFields } from './index_fields';
import { IpDetails } from './ip_details';
import { KpiHosts } from './kpi_hosts';
import { KpiNetwork } from './kpi_network';
import { Network } from './network';
import { Overview } from './overview';
import { SourceStatus } from './source_status';
import { Sources, SourceConfiguration } from './sources';
import { UncommonProcesses } from './uncommon_processes';
import { Note } from './note/saved_object';
import { PinnedEvent } from './pinned_event/saved_object';
import { Timeline } from './timeline/saved_object';
import { TLS } from './tls';
import { SearchTypes, OutputRuleAlertRest } from './detection_engine/alerts/types';

export * from './hosts';

export interface AppDomainLibs {
  anomalies: Anomalies;
  authentications: Authentications;
  events: Events;
  fields: IndexFields;
  hosts: Hosts;
  ipDetails: IpDetails;
  network: Network;
  kpiNetwork: KpiNetwork;
  overview: Overview;
  uncommonProcesses: UncommonProcesses;
  kpiHosts: KpiHosts;
  tls: TLS;
}

export interface AppBackendLibs extends AppDomainLibs {
  configuration: ConfigurationAdapter<Configuration>;
  framework: FrameworkAdapter;
  sources: Sources;
  sourceStatus: SourceStatus;
  timeline: Timeline;
  note: Note;
  pinnedEvent: PinnedEvent;
}

export interface Configuration {
  enabled: boolean;
  query: {
    partitionSize: number;
    partitionFactor: number;
  };
  sources: Record<string, SourceConfiguration>;
}

export interface SiemContext {
  req: FrameworkRequest;
}

export interface Signal {
  rule: Partial<OutputRuleAlertRest>;
  parent: {
    id: string;
    type: string;
    index: string;
    depth: number;
  };
  original_time: string;
  original_event?: SearchTypes;
  status: 'open' | 'closed';
}

export interface SignalHit {
  '@timestamp': string;
  event: object;
  signal: Partial<Signal>;
}

export interface TotalValue {
  value: number;
  relation: string;
}

export interface SearchResponse<T> {
  took: number;
  timed_out: boolean;
  _scroll_id?: string;
  _shards: ShardsResponse;
  hits: {
    total: TotalValue | number;
    max_score: number;
    hits: Array<{
      _index: string;
      _type: string;
      _id: string;
      _score: number;
      _source: T;
      _version?: number;
      _explanation?: Explanation;
      fields?: string[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      highlight?: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inner_hits?: any;
      matched_queries?: string[];
      sort?: string[];
    }>;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  aggregations?: any;
}

export interface ShardsResponse {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
}

export interface Explanation {
  value: number;
  description: string;
  details: Explanation[];
}

export type SearchHit = SearchResponse<object>['hits']['hits'][0];

export interface TermAggregation {
  [agg: string]: {
    buckets: Array<{
      key: string;
      doc_count: number;
    }>;
  };
}

export interface TotalHit {
  value: number;
  relation: string;
}

export interface Hit {
  _index: string;
  _type: string;
  _id: string;
  _score: number | null;
}

export interface Hits<T, U> {
  hits: {
    total: T;
    max_score: number | null;
    hits: U[];
  };
}
export type SortRequestDirection = 'asc' | 'desc';

interface SortRequestField {
  [field: string]: SortRequestDirection;
}

export type SortRequest = SortRequestField[];

export interface MSearchHeader {
  index: string[] | string;
  allowNoIndices?: boolean;
  ignoreUnavailable?: boolean;
}

export interface AggregationRequest {
  [aggField: string]: {
    terms?: {
      field: string;
      size?: number;
      order?: {
        [aggSortField: string]: SortRequestDirection;
      };
    };
    max?: {
      field: string;
    };
    aggs?: {
      [aggSortField: string]: {
        [aggType: string]: {
          field: string;
        };
      };
    };
    top_hits?: {
      size?: number;
      sort?: Array<{
        [aggSortField: string]: {
          order: SortRequestDirection;
        };
      }>;
      _source: {
        includes: string[];
      };
    };
  };
}
