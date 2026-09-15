/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const NIGHTSHIFT_SOURCES_API_BASE_PATH = '/internal/nightshift/sources';

export type {
  CreateSourceRequest,
  DeleteSourceResponse,
  GetSourceResponse,
  ListSourcesQuery,
  ListSourcesResponse,
  NightshiftSource,
  Source,
  SourceHealth,
  SourceMutationResponse,
  SourceWithHealth,
  UpdateSourceRequest,
} from '@kbn/nightshift-shared';
