/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// TODO: Define interface to send to Cloud
export interface LocalClusterState {
  name: string;
  version: string;
  nodes: {
    total: number;
  };
  indices: {
    shards: {
      total: number;
      replication: number;
    };
  };
  os: {
    processors: number;
    memory: number;
  };
  plugins: {
    ml: boolean;
    apm: boolean;
    monitoring: boolean;
  };
  geoLocalisation: {
    country: string;
    continent: string;
  };
}

export interface CloudClusterConfiguration {
  provider: 'AWS' | 'Gcloud';
  zone: string;
}
