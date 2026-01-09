/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser } from '@kbn/core/server';
import type { InputType } from '../../common';

export interface CreateIntegrationParams {
  integrationParams: IntegrationParams;
  authenticatedUser: AuthenticatedUser;
}

export interface CreateDataStreamParams {
  dataStreamParams: DataStreamParams;
  authenticatedUser: AuthenticatedUser;
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
