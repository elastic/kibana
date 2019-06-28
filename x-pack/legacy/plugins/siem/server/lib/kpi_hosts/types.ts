/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FrameworkRequest, RequestBasicOptions } from '../framework';
import { MSearchHeader, SearchHit } from '../types';
import { KpiHostHistogramData } from '../../graphql/types';

export interface KpiHostsMappedData {
  hosts?: number | null;
  hostsHistogram?: KpiHostHistogramData[] | null;
  authSuccess?: number | null;
  authSuccessHistogram?: KpiHostHistogramData[] | null;
  authFailure?: number | null;
  authFailureHistogram?: KpiHostHistogramData[] | null;
  uniqueSourceIps?: number | null;
  uniqueSourceIpsHistogram?: KpiHostHistogramData[] | null;
  uniqueDestinationIps?: number | null;
  uniqueDestinationIpsHistogram?: KpiHostHistogramData[] | null;
}

export interface KpiHostsAdapter {
  getKpiHosts(request: FrameworkRequest, options: RequestBasicOptions): Promise<KpiHostsMappedData>;
}

export interface KpiHostHistogram<T> {
  key_as_string: string;
  key: number;
  doc_count: number;
  count: T;
}

export interface KpiHostGeneralHistogramCount {
  value: number;
}

export interface KpiHostAuthHistogramCount {
  doc_count: number;
}

export interface KpiHostsGeneralHit extends SearchHit {
  aggregations: {
    hosts: {
      value: number;
    };
    hosts_histogram: {
      buckets: Array<KpiHostHistogram<KpiHostGeneralHistogramCount>>;
    };
    unique_source_ips: {
      value: number;
    };
    unique_source_ips_histogram: {
      buckets: Array<KpiHostHistogram<KpiHostGeneralHistogramCount>>;
    };
    unique_destination_ips: {
      value: number;
    };
    unique_destination_ips_histogram: {
      buckets: Array<KpiHostHistogram<KpiHostGeneralHistogramCount>>;
    };
  };
  _shards: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  hits: {
    max_score: number | null;
    hits: [];
  };
  took: number;
  timeout: number;
}

export interface KpiHostsAuthHit extends SearchHit {
  aggregations: {
    authentication_success: {
      doc_count: number;
    };
    authentication_success_histogram: {
      buckets: Array<KpiHostHistogram<KpiHostAuthHistogramCount>>;
    };
    authentication_failure: {
      doc_count: number;
    };
    authentication_failure_histogram: {
      buckets: Array<KpiHostHistogram<KpiHostAuthHistogramCount>>;
    };
  };
  _shards: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  hits: {
    max_score: number | null;
    hits: [];
  };
  took: number;
  timeout: number;
}

export interface KpiHostsBody {
  query?: object;
  aggregations?: object;
  size?: number;
  track_total_hits?: boolean;
}

export type KpiHostsESMSearchBody = KpiHostsBody | MSearchHeader;

export interface EventModuleAttributeQuery {
  agentType: 'auditbeat' | 'winlogbeat' | 'filebeat';
  eventModule?: 'file_integrity' | 'auditd';
}
