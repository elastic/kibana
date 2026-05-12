/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DataStreamsStatsServiceSetup,
  DataStreamsStatsServiceStartDeps,
  DataStreamsStatsServiceStart,
  IDataStreamsStatsClient,
} from './types';

export class DataStreamsStatsService {
  private client?: IDataStreamsStatsClient;

  public setup(): DataStreamsStatsServiceSetup {}

  public start({
    http,
    telemetryClient,
  }: DataStreamsStatsServiceStartDeps): DataStreamsStatsServiceStart {
    return {
      getClient: () => this.getClient({ http, telemetryClient }),
    };
  }

  private async getClient({ http, telemetryClient }: DataStreamsStatsServiceStartDeps) {
    if (!this.client) {
      const { DataStreamsStatsClient } = await import('./data_streams_stats_client');
      const client = new DataStreamsStatsClient(http, telemetryClient);
      this.client = client;
    }

    return this.client;
  }
}
