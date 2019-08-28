/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface VisState {
  type: string;
}

export interface Visualization {
  visState: string;
}

export interface SavedObjectDoc {
  _id: string;
  _source: {
    visualization: Visualization;
    type: string;
  };
}

export interface ESQueryResponse {
  hits: {
    hits: SavedObjectDoc[];
  };
}

export interface TaskInstance {
  state: {
    runs: number;
    stats: any;
  };
  error?: any;
}

export interface HapiServer {
  plugins: {
    xpack_main: any;
    elasticsearch: {
      getCluster: (
        cluster: string
      ) => {
        callWithInternalUser: () => Promise<ESQueryResponse>;
      };
    };
    task_manager: {
      registerTaskDefinitions: (opts: any) => void;
      schedule: (opts: any) => Promise<void>;
      fetch: (
        opts: any
      ) => Promise<{
        docs: TaskInstance[];
      }>;
    };
  };
  usage: {
    collectorSet: {
      register: (collector: any) => void;
      makeUsageCollector: (collectorOpts: any) => void;
    };
  };
  config: () => {
    get: (prop: string) => any;
  };
  log: (context: string[], message: string) => void;
}
