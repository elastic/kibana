/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestPipelineParams } from '@kbn/search-connectors';

import { HttpSetup } from '@kbn/core/public';
import { createApiLogic } from '../api_logic/create_api_logic';

export type FetchDefaultPipelineResponse = IngestPipelineParams;

export const getDefaultPipeline = async (
  http?: HttpSetup
): Promise<FetchDefaultPipelineResponse | undefined> => {
  const route = '/internal/content_connectors/connectors/default_pipeline';

  return await http?.get(route);
};

export const FetchDefaultPipelineApiLogic = createApiLogic(
  ['content', 'get_default_pipeline_api_logic'],
  getDefaultPipeline
);
