/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { COMPUTED_FEATURE_TYPES, type BaseFeature } from '@kbn/significant-events-schema';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Streams } from '@kbn/streams-schema';
import { generateAllComputedFeatures } from '@kbn/streams-ai';
import type { KnowledgeIndicatorClient } from '../../knowledge_indicators';
import { identifyComputedFeatures } from './identify_computed_features';
import { assessComputedFeatureMateriality } from './assess_computed_feature_materiality';

jest.mock('@kbn/streams-ai', () => ({
  ...jest.requireActual('@kbn/streams-ai'),
  generateAllComputedFeatures: jest.fn(),
}));
jest.mock('./assess_computed_feature_materiality');

const generateAllComputedFeaturesMock = generateAllComputedFeatures as jest.Mock;
const assessMock = assessComputedFeatureMateriality as jest.Mock;

const computed = (type: string): BaseFeature =>
  ({ id: type, type, title: type, properties: { value: 1 } } as unknown as BaseFeature);

const createKiClient = (previous: BaseFeature[]) =>
  ({
    getFeatures: jest.fn().mockResolvedValue({ hits: previous }),
    getDefaultExpiresAt: jest.fn().mockReturnValue('2099-01-01T00:00:00.000Z'),
    bulk: jest.fn().mockResolvedValue(undefined),
  } as unknown as KnowledgeIndicatorClient);

const baseOptions = (kiClient: KnowledgeIndicatorClient) => ({
  stream: {} as Streams.all.Definition,
  streamName: 'logs-test',
  start: 0,
  end: 1,
  esClient: {} as ElasticsearchClient,
  kiClient,
  logger: loggingSystemMock.createLogger(),
  runId: 'run-1',
});

describe('identifyComputedFeatures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    generateAllComputedFeaturesMock.mockResolvedValue([computed('log_patterns')]);
  });

  it('skips the gate and returns materialChange: false when no gate client is provided', async () => {
    const kiClient = createKiClient([]);

    const result = await identifyComputedFeatures(baseOptions(kiClient));

    expect(result.materialChange).toBe(false);
    expect(result.features).toHaveLength(1);
    expect(kiClient.getFeatures).not.toHaveBeenCalled();
    expect(assessMock).not.toHaveBeenCalled();
    expect(kiClient.bulk).toHaveBeenCalledTimes(1);
  });

  it('reads the prior computed set before writing and forwards the assessment verdict', async () => {
    const previous = [computed('log_patterns')];
    const kiClient = createKiClient(previous);
    const gateInferenceClient = {} as BoundInferenceClient;
    assessMock.mockResolvedValue({ materialChange: true, reason: 'structural change' });

    const callOrder: string[] = [];
    (kiClient.getFeatures as jest.Mock).mockImplementation(() => {
      callOrder.push('getFeatures');
      return Promise.resolve({ hits: previous });
    });
    (kiClient.bulk as jest.Mock).mockImplementation(() => {
      callOrder.push('bulk');
      return Promise.resolve(undefined);
    });

    const result = await identifyComputedFeatures({ ...baseOptions(kiClient), gateInferenceClient });

    expect(kiClient.getFeatures).toHaveBeenCalledWith('logs-test', {
      type: [...COMPUTED_FEATURE_TYPES],
      includeExpired: true,
    });
    expect(callOrder).toEqual(['getFeatures', 'bulk']);
    expect(assessMock).toHaveBeenCalledWith(
      expect.objectContaining({ inferenceClient: gateInferenceClient, previous })
    );
    expect(result).toEqual(
      expect.objectContaining({ materialChange: true, materialChangeReason: 'structural change' })
    );
  });

  it('still runs the assessment when nothing was generated (no bulk write)', async () => {
    generateAllComputedFeaturesMock.mockResolvedValue([]);
    const kiClient = createKiClient([computed('log_patterns')]);
    assessMock.mockResolvedValue({ materialChange: true, reason: 'features disappeared' });

    const result = await identifyComputedFeatures({
      ...baseOptions(kiClient),
      gateInferenceClient: {} as BoundInferenceClient,
    });

    expect(kiClient.bulk).not.toHaveBeenCalled();
    expect(assessMock).toHaveBeenCalledWith(expect.objectContaining({ current: [] }));
    expect(result.materialChange).toBe(true);
  });
});
