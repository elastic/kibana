/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';

import { nextTick } from '@kbn/test-jest-helpers';

import { getDefaultPipeline } from './get_default_pipeline_api_logic';

describe('getDefaultPipelineApiLogic', () => {
  const http = httpServiceMock.createSetupContract();
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('updatePipeline', () => {
    it('calls correct api', async () => {
      const promise = Promise.resolve('result');
      http.get.mockReturnValue(promise);
      const result = getDefaultPipeline(http);
      await nextTick();
      expect(http.get).toHaveBeenCalledWith(
        '/internal/content_connectors/connectors/default_pipeline'
      );
      await expect(result).resolves.toEqual('result');
    });
  });
});
