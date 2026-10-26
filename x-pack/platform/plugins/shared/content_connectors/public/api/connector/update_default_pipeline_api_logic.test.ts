/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';

import { nextTick } from '@kbn/test-jest-helpers';

import { updateDefaultPipeline } from './update_default_pipeline_api_logic';

describe('updateDefaultPipelineApiLogic', () => {
  const http = httpServiceMock.createSetupContract();
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('updateDefaultPipeline', () => {
    it('calls correct api', async () => {
      const promise = Promise.resolve('result');
      http.post.mockReturnValue(promise);
      const pipeline = {
        extract_binary_content: true,
        name: 'pipelineName',
        reduce_whitespace: false,
        run_ml_inference: true,
      };
      const result = updateDefaultPipeline({ ...pipeline, http });
      await nextTick();
      expect(http.put).toHaveBeenCalledWith(
        '/internal/content_connectors/connectors/default_pipeline',
        {
          body: JSON.stringify(pipeline),
        }
      );
      await expect(result).resolves.toEqual(pipeline);
    });
  });
});
