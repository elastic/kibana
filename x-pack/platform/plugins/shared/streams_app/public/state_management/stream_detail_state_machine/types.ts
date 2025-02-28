/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { IngestStreamGetResponse } from '@kbn/streams-schema';

export interface StreamDetailServiceDependencies {
  streamsRepositoryClient: StreamsRepositoryClient;
}

export interface StreamDetailInput {
  name: string;
}

export interface StreamDetailContext {
  name: string;
  definition?: IngestStreamGetResponse;
  error: Error | null;
}

export type StreamDetailEvent =
  | { type: 'definition.updateName'; name: string }
  | { type: 'definition.reload' };
