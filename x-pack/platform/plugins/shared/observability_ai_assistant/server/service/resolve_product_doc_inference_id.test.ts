/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { loggerMock } from '@kbn/logging-mocks';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { getInferenceIdFromWriteIndex } from './knowledge_base_service/get_inference_id_from_write_index';
import { resolveObservabilityProductDocInferenceId } from './resolve_product_doc_inference_id';

jest.mock('./knowledge_base_service/get_inference_id_from_write_index', () => ({
  getInferenceIdFromWriteIndex: jest.fn(),
}));

const getInferenceIdFromWriteIndexMock = getInferenceIdFromWriteIndex as jest.MockedFunction<
  typeof getInferenceIdFromWriteIndex
>;

describe('resolveObservabilityProductDocInferenceId', () => {
  const logger = loggerMock.create();
  const inferenceGet = jest.fn();
  const esClient = {
    asInternalUser: {
      inference: { get: inferenceGet },
    },
  } as unknown as { asInternalUser: ElasticsearchClient };

  beforeEach(() => {
    inferenceGet.mockReset();
    getInferenceIdFromWriteIndexMock.mockReset();
  });

  it('uses the environment default when that documentation is installed', async () => {
    inferenceGet.mockResolvedValue({
      endpoints: [{ inference_id: defaultInferenceEndpoints.JINAv5 }],
    });
    getInferenceIdFromWriteIndexMock.mockResolvedValue(defaultInferenceEndpoints.ELSER);

    const result = await resolveObservabilityProductDocInferenceId({
      esClient,
      logger,
      isDocumentationAvailable: async (inferenceId) =>
        inferenceId === defaultInferenceEndpoints.JINAv5 ||
        inferenceId === defaultInferenceEndpoints.ELSER,
    });

    expect(result).toBe(defaultInferenceEndpoints.JINAv5);
    expect(getInferenceIdFromWriteIndexMock).not.toHaveBeenCalled();
  });

  it('uses the knowledge base model when no default documentation is installed', async () => {
    inferenceGet.mockResolvedValue({
      endpoints: [{ inference_id: defaultInferenceEndpoints.ELSER }],
    });
    getInferenceIdFromWriteIndexMock.mockResolvedValue('custom-embedding');

    const result = await resolveObservabilityProductDocInferenceId({
      esClient,
      logger,
      isDocumentationAvailable: async (inferenceId) => inferenceId === 'custom-embedding',
    });

    expect(result).toBe('custom-embedding');
  });

  it('returns undefined when nothing is installed', async () => {
    inferenceGet.mockResolvedValue({ endpoints: [] });
    getInferenceIdFromWriteIndexMock.mockResolvedValue(undefined);

    const result = await resolveObservabilityProductDocInferenceId({
      esClient,
      logger,
      isDocumentationAvailable: async () => false,
    });

    expect(result).toBeUndefined();
  });
});
