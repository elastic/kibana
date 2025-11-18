/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import type { KibanaClient } from '@kbn/kibana-api-cli';

export class StreamsService {
  private cachedStreams?: Streams.all.Definition[];
  private inflightRequest?: Promise<Streams.all.Definition[]>;

  constructor(private readonly kibanaClient: KibanaClient) {}

  /**
   * Returns the list of streams from memory when available, falling back
   * to the network request on first use or when a refresh is requested.
   */
  public async listStreams(
    signal: AbortSignal,
    options: { refresh?: boolean } = {}
  ): Promise<Streams.all.Definition[]> {
    if (options.refresh) {
      this.clearCache();
    }

    if (this.cachedStreams) {
      return this.cachedStreams;
    }

    if (!this.inflightRequest) {
      this.inflightRequest = this.fetchStreams(signal)
        .then((streams) => {
          this.cachedStreams = streams;
          this.inflightRequest = undefined;
          return streams;
        })
        .catch((error) => {
          this.inflightRequest = undefined;
          throw error;
        });
    }

    return this.inflightRequest;
  }

  public clearCache() {
    this.cachedStreams = undefined;
  }

  private async fetchStreams(signal: AbortSignal): Promise<Streams.all.Definition[]> {
    const response = await this.kibanaClient.fetch<{ streams: Streams.all.Definition[] }>(
      '/api/streams',
      {
        method: 'GET',
        signal,
      }
    );

    return response.streams;
  }
}
