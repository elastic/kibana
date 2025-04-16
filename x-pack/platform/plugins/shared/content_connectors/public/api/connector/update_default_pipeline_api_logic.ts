/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { IngestPipelineParams } from '@kbn/search-connectors';
import { HttpSetup } from '@kbn/core/public';
import { createApiLogic } from '../api_logic/create_api_logic';

export type PostDefaultPipelineResponse = IngestPipelineParams;
export type PostDefaultPipelineArgs = IngestPipelineParams & { http?: HttpSetup };

export const updateDefaultPipeline = async (
  args: PostDefaultPipelineArgs
): Promise<PostDefaultPipelineResponse> => {
  const route = '/internal/content_connectors/connectors/default_pipeline';
  const pipeline = {
    extract_binary_content: args.extract_binary_content,
    name: args.name,
    reduce_whitespace: args.reduce_whitespace,
    run_ml_inference: args.run_ml_inference,
  };

  await args.http?.put(route, { body: JSON.stringify(pipeline) });
  return pipeline;
};

export const UpdateDefaultPipelineApiLogic = createApiLogic(
  ['content', 'update_default_pipeline_api_logic'],
  updateDefaultPipeline,
  {
    showSuccessFlashFn: () =>
      i18n.translate(
        'xpack.contentConnectors.content.indices.defaultPipelines.successToast.title',
        {
          defaultMessage: 'Default pipeline successfully updated',
        }
      ),
  }
);
