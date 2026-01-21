/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, ElasticsearchClient } from '@kbn/core/server';
import type { InputType } from '../../common';

export interface CreateIntegrationParams {
  integrationParams: IntegrationParams;
  authenticatedUser: AuthenticatedUser;
}

export interface CreateDataStreamParams {
  dataStreamParams: DataStreamParams;
  authenticatedUser: AuthenticatedUser;
  /**
   * Scoped ES client for any synchronous work done when the route is called.
   * This client is NOT stored in the task params (Task Manager serializes params).
   */
  esClient: ElasticsearchClient;
  /**
   * Inference connector to use when the background task runs.
   */
  connectorId: string;
  /**
   * Minimal set of auth headers required to reconstruct a scoped client
   * as the original user inside the Task Manager runner.
   * Must be JSON-serializable.
   */
  authHeaders?: Record<string, string | string[]>;
}

export interface IntegrationParams {
  integrationId: string;
  logo?: string;
  description: string;
  title: string;
}

export interface DataStreamParams {
  integrationId: string;
  dataStreamId: string;
  title: string;
  description: string;
  inputTypes: InputType[];
  jobInfo?: {
    jobId: string;
    jobType: string;
    status: string;
  };
  metadata: {
    sampleCount?: number;
    createdAt: string;
  };
}
