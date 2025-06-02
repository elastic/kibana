/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

import type { IngestPipelineParams } from '@kbn/search-connectors';
import { createApiLogic } from '../api_logic/create_api_logic';

export interface PostPipelineArgs {
  connectorId: string;
  pipeline: IngestPipelineParams;
  http?: HttpSetup;
}

export interface PostPipelineResponse {
  connectorId: string;
  pipeline: IngestPipelineParams;
}

export const updatePipeline = async ({
  connectorId,
  pipeline,
  http,
}: PostPipelineArgs): Promise<PostPipelineResponse> => {
  const route = `/internal/content_connectors/connectors/${connectorId}/pipeline`;

  await http?.put(route, {
    body: JSON.stringify(pipeline),
  });
  return { connectorId, pipeline };
};

export const UpdatePipelineApiLogic = createApiLogic(
  ['content', 'update_pipeline_api_logic'],
  updatePipeline,
  {
    showSuccessFlashFn: () =>
      i18n.translate('xpack.contentConnectors.content.indices.pipelines.successToast.title', {
        defaultMessage: 'Pipelines updated',
      }),
  }
);
