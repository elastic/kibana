/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnector } from '@kbn/inference-common';
import type { KibanaClient } from '@kbn/kibana-api-cli';

export class ConnectorsService {
  constructor(private readonly kibanaClient: KibanaClient) {}

  public async list(signal: AbortSignal): Promise<InferenceConnector[]> {
    const response = await this.kibanaClient.fetch<{ connectors: InferenceConnector[] }>(
      '/internal/inference/connectors',
      {
        method: 'GET',
        signal,
        body: undefined,
      }
    );

    return response.connectors;
  }
}
