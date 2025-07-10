/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceConnector } from '@kbn/inference-common';
import { KibanaClient } from '@kbn/kibana-api-cli';

export async function getConnectors(kibanaClient: KibanaClient): Promise<InferenceConnector[]> {
  const { connectors } = await kibanaClient.fetch<{
    connectors: InferenceConnector[];
  }>('/internal/inference/connectors');

  return connectors;
}
