/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { IngestPipelineParams } from '@kbn/search-connectors';
import { HttpSetup } from '@kbn/core/public';
import { createApiLogic } from '../api_logic/create_api_logic';

export type PostDefaultPipelineResponse = IngestPipelineParams;
export type PostDefaultPipelineArgs = IngestPipelineParams & { http?: HttpSetup };

export const updateDefaultPipeline = async (
  pipeline: IngestPipelineParams,
  http?: HttpSetup
): Promise<PostDefaultPipelineResponse> => {
  const route = '/internal/enterprise_search/connectors/default_pipeline';

  await http?.put(route, { body: JSON.stringify(pipeline) });

  return pipeline;
};

export const UpdateDefaultPipelineApiLogic = createApiLogic(
  ['content', 'update_default_pipeline_api_logic'],
  updateDefaultPipeline,
  {
    showSuccessFlashFn: () =>
      i18n.translate('xpack.enterpriseSearch.content.indices.defaultPipelines.successToast.title', {
        defaultMessage: 'Default pipeline successfully updated',
      }),
  }
);
