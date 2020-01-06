/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export * from './errors_types';

export interface BasicSignals {
  kbnVersion: string;
  signal: AbortSignal;
}
export interface QuerySignals extends BasicSignals {
  query: string;
}

export interface SignalsResponse {
  took: number;
  timeout: boolean;
}

export interface SignalSearchResponse<Hit = {}, Aggregations = undefined> extends SignalsResponse {
  _shards: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  aggregations?: Aggregations;
  hits: {
    total: {
      value: number;
      relation: string;
    };
    hits: Hit[];
  };
}

export interface UpdateSignalStatusProps {
  query: object;
  status: 'open' | 'closed';
  kbnVersion: string;
  signal?: AbortSignal; // TODO: implement cancelling
}

export interface SignalsIndex {
  name: string;
}

export interface Privilege {
  username: string;
  has_all_requested: boolean;
  cluster: {
    monitor_ml: boolean;
    manage_ccr: boolean;
    manage_index_templates: boolean;
    monitor_watcher: boolean;
    monitor_transform: boolean;
    read_ilm: boolean;
    manage_api_key: boolean;
    manage_security: boolean;
    manage_own_api_key: boolean;
    manage_saml: boolean;
    all: boolean;
    manage_ilm: boolean;
    manage_ingest_pipelines: boolean;
    read_ccr: boolean;
    manage_rollup: boolean;
    monitor: boolean;
    manage_watcher: boolean;
    manage: boolean;
    manage_transform: boolean;
    manage_token: boolean;
    manage_ml: boolean;
    manage_pipeline: boolean;
    monitor_rollup: boolean;
    transport_client: boolean;
    create_snapshot: boolean;
  };
  index: {
    [indexName: string]: {
      all: boolean;
      manage_ilm: boolean;
      read: boolean;
      create_index: boolean;
      read_cross_cluster: boolean;
      index: boolean;
      monitor: boolean;
      delete: boolean;
      manage: boolean;
      delete_index: boolean;
      create_doc: boolean;
      view_index_metadata: boolean;
      create: boolean;
      manage_follow_index: boolean;
      manage_leader_index: boolean;
      write: boolean;
    };
  };
  isAuthenticated: boolean;
}
