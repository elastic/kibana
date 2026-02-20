/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DataStreamDetailsServiceSetup,
  DataStreamDetailsServiceStartDeps,
  DataStreamDetailsServiceStart,
  IDataStreamDetailsClient,
} from './types';

export class DataStreamDetailsService {
  private client?: IDataStreamDetailsClient;

  public setup(): DataStreamDetailsServiceSetup {}

  public start({
    http,
    telemetryClient,
  }: DataStreamDetailsServiceStartDeps): DataStreamDetailsServiceStart {
    return {
      getClient: () => this.getClient({ http, telemetryClient }),
    };
  }

  private async getClient({ http, telemetryClient }: DataStreamDetailsServiceStartDeps) {
    if (!this.client) {
      const { DataStreamDetailsClient } = await import('./data_stream_details_client');
      const client = new DataStreamDetailsClient(http, telemetryClient);
      this.client = client;
    }

    return this.client;
  }
}
