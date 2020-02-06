/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AuthenticationsData,
  AuthenticationsOverTimeData,
  LastSourceHost,
} from '../../graphql/types';
import {
  FrameworkRequest,
  RequestOptionsPaginated,
  MatrixHistogramRequestOptions,
} from '../framework';
import { Hit, SearchHit, TotalHit } from '../types';

export interface AuthenticationsAdapter {
  getAuthentications(
    req: FrameworkRequest,
    options: RequestOptionsPaginated
  ): Promise<AuthenticationsData>;
  getAuthenticationsOverTime(
    req: FrameworkRequest,
    options: MatrixHistogramRequestOptions
  ): Promise<AuthenticationsOverTimeData>;
}

type StringOrNumber = string | number;
export interface AuthenticationHit extends Hit {
  _source: {
    '@timestamp': string;
    lastSuccess?: LastSourceHost;
    lastFailure?: LastSourceHost;
  };
  user: string;
  failures: number;
  successes: number;
  cursor?: string;
  sort: StringOrNumber[];
}

export interface AuthenticationBucket {
  key: {
    user_uid: string;
  };
  doc_count: number;
  failures: {
    doc_count: number;
  };
  successes: {
    doc_count: number;
  };
  authentication: {
    hits: {
      total: TotalHit;
      hits: ArrayLike<AuthenticationHit>;
    };
  };
}

export interface AuthenticationData extends SearchHit {
  sort: string[];
  aggregations: {
    process_count: {
      value: number;
    };
    group_by_process: {
      after_key: string;
      buckets: AuthenticationBucket[];
    };
  };
}

interface AuthenticationsOverTimeHistogramData {
  key_as_string: string;
  key: number;
  doc_count: number;
}

export interface AuthenticationsActionGroupData {
  key: number;
  events: {
    bucket: AuthenticationsOverTimeHistogramData[];
  };
  doc_count: number;
}
