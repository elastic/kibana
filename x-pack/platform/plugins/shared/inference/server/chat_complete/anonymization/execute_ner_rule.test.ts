/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { NamedEntityRecognitionRule } from '@kbn/inference-common';
import { executeNerRule } from './execute_ner_rule';

const mockEsClient = {
  ml: {
    inferTrainedModel: jest.fn(),
  },
} as any;

describe('executeNerRule', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('throws a user-friendly error when the NER model is not found', async () => {
    const rule: NamedEntityRecognitionRule = {
      type: 'NER',
      enabled: true,
      modelId: 'model-1',
    };

    const state = {
      records: [{ content: 'My name is Alice and I live in Springfield' }],
      anonymizations: [],
    };

    mockEsClient.ml.inferTrainedModel.mockRejectedValueOnce(
      new errors.ResponseError({
        warnings: [],

        meta: {} as any,
        body: {
          error: {
            type: 'resource_not_found_exception',
            reason: 'resource_not_found_exception',
          },
        },
        statusCode: 404,
        headers: {},
      } as any)
    );

    await expect(executeNerRule({ state, rule, esClient: mockEsClient })).rejects.toThrow(
      `The NER model '${rule.modelId}' was not found. ` +
        `Please download and deploy the model before enabling anonymization. ` +
        `For instructions, see: https://www.elastic.co/docs/explore-analyze/machine-learning/nlp/ml-nlp-ner-example`
    );
  });

  it('throws a user-friendly error when the NER model is not deployed', async () => {
    const rule: NamedEntityRecognitionRule = {
      type: 'NER',
      enabled: true,
      modelId: 'model-1',
    };

    const state = {
      records: [{ content: 'My name is Alice and I live in Springfield' }],
      anonymizations: [],
    };

    mockEsClient.ml.inferTrainedModel.mockRejectedValueOnce(
      new errors.ResponseError({
        warnings: [],

        meta: {} as any,
        body: {
          error: {
            type: 'status_exception',
            reason: `model [${rule.modelId}] must be deployed`,
          },
        },
        statusCode: 409,
        headers: {},
      } as any)
    );

    await expect(executeNerRule({ state, rule, esClient: mockEsClient })).rejects.toThrow(
      `The NER model '${rule.modelId}' is not deployed. ` +
        `Please deploy the model before enabling anonymization. ` +
        `For instructions, see: https://www.elastic.co/docs/explore-analyze/machine-learning/nlp/ml-nlp-deploy-model`
    );
  });
});
