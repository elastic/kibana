/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RuleAlertParams, OutputRuleAlertRest } from '../types';
import { SearchResponse } from '../../types';
import { RequestFacade } from '../../../types';
import { AlertType, State, AlertExecutorOptions } from '../../../../../alerting/server/types';

export interface SignalsParams {
  signalIds: string[] | undefined | null;
  query: object | undefined | null;
  status: 'open' | 'closed';
}

export interface SignalsStatusParams {
  signalIds: string[] | undefined | null;
  query: object | undefined | null;
  status: 'open' | 'closed';
}

export interface SignalQueryParams {
  query: object | undefined | null;
  aggs: object | undefined | null;
  _source: string[] | undefined | null;
  size: number | undefined | null;
  track_total_hits: boolean | undefined | null;
}

export type SignalsStatusRestParams = Omit<SignalsStatusParams, 'signalIds'> & {
  signal_ids: SignalsStatusParams['signalIds'];
};

export type SignalsQueryRestParams = SignalQueryParams;

export interface SignalsStatusRequest extends RequestFacade {
  payload: SignalsStatusRestParams;
}

export interface SignalsQueryRequest extends RequestFacade {
  payload: SignalsQueryRestParams;
}

export type SearchTypes =
  | string
  | string[]
  | number
  | number[]
  | boolean
  | boolean[]
  | object
  | object[];

export interface SignalSource {
  [key: string]: SearchTypes;
  '@timestamp': string;
}

export interface BulkResponse {
  took: number;
  errors: boolean;
  items: [
    {
      create: {
        _index: string;
        _type?: string;
        _id: string;
        _version: number;
        result?: string;
        _shards?: {
          total: number;
          successful: number;
          failed: number;
        };
        _seq_no?: number;
        _primary_term?: number;
        status: number;
        error?: {
          type: string;
          reason: string;
          index_uuid?: string;
          shard: string;
          index: string;
        };
      };
    }
  ];
}

export interface MGetResponse {
  docs: GetResponse[];
}
export interface GetResponse {
  _index: string;
  _type: string;
  _id: string;
  _version: number;
  _seq_no: number;
  _primary_term: number;
  found: boolean;
  _source: SearchTypes;
}

export type SignalSearchResponse = SearchResponse<SignalSource>;
export type SignalSourceHit = SignalSearchResponse['hits']['hits'][0];

export type RuleExecutorOptions = Omit<AlertExecutorOptions, 'params'> & {
  params: RuleAlertParams & {
    scrollSize: number;
    scrollLock: string;
  };
};

// This returns true because by default a RuleAlertTypeDefinition is an AlertType
// since we are only increasing the strictness of params.
export const isAlertExecutor = (obj: SignalRuleAlertTypeDefinition): obj is AlertType => {
  return true;
};

export type SignalRuleAlertTypeDefinition = Omit<AlertType, 'executor'> & {
  executor: ({ services, params, state }: RuleExecutorOptions) => Promise<State | void>;
};

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
