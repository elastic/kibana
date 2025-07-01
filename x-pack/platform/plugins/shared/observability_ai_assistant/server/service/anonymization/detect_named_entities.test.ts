/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { detectNamedEntities } from './detect_named_entities';
import type { DetectedEntity, NerAnonymizationRule } from '../../../common/types';

jest.mock('@kbn/inference-tracing', () => ({
  withInferenceSpan: (_name: string, fn: any) => fn(),
}));

const mockLogger = {
  debug: jest.fn(),
  warn: jest.fn(),
} as any;

// Helper to build DetectedEntity quickly
const makeEntity = (entity: string, start: number): DetectedEntity =>
  ({
    entity,
    class_name: 'LOC',
    class_probability: 1,
    start_pos: start,
    end_pos: start + entity.length,
    type: 'ner',
    hash: `hash-${entity}`,
  } as DetectedEntity);

// Stub ml.inferTrainedModel so that model-1 returns two entities and model-2 returns the third
const inferStub = jest.fn().mockImplementation(({ model_id: modelId }: { model_id: string }) => {
  return {
    inference_results: [
      {
        entities:
          modelId === 'model-1'
            ? [makeEntity('NY', 0), makeEntity('LA', 3)]
            : [makeEntity('SF', 6)],
      },
    ],
  };
});

const esClientMock = {
  asCurrentUser: {
    ml: {
      inferTrainedModel: inferStub,
    },
  },
} as any;

const nerRules: NerAnonymizationRule[] = [
  { type: 'ner', enabled: true, modelId: 'model-1' } as any,
  { type: 'ner', enabled: true, modelId: 'model-2' } as any,
];

describe('detectNamedEntities', () => {
  beforeEach(() => {
    inferStub.mockReset();
  });

  it('returns empty array when no NER rules are provided', async () => {
    const out = await detectNamedEntities('anything', [], mockLogger, esClientMock);
    expect(out).toEqual([]);
  });

  it('returns empty array when rules produce no entities', async () => {
    inferStub.mockResolvedValueOnce({ inference_results: [{ entities: [] }] });
    const rules: NerAnonymizationRule[] = [{ type: 'ner', enabled: true, modelId: 'noop' } as any];
    const out = await detectNamedEntities('text', rules, mockLogger, esClientMock);
    expect(out).toEqual([]);
  });

  it('allows subsequent models to add additional entities of same class', async () => {
    inferStub
      .mockResolvedValueOnce({
        inference_results: [{ entities: [makeEntity('NY', 0), makeEntity('LA', 3)] }],
      })
      .mockResolvedValueOnce({
        inference_results: [{ entities: [makeEntity('SF', 6)] }],
      });

    const entities = await detectNamedEntities('NY LA SF', nerRules, mockLogger, esClientMock);
    const names = entities.map((e) => e.entity).sort();

    expect(names).toEqual(['LA', 'NY', 'SF']);
    expect(inferStub).toHaveBeenCalledTimes(2);
  });

  it('does not duplicate entities already detected by previous model', async () => {
    // 1st model finds NY, 2nd model returns SF only
    inferStub
      .mockResolvedValueOnce({
        inference_results: [{ entities: [makeEntity('NY', 0)] }],
      })
      .mockResolvedValueOnce({
        inference_results: [{ entities: [makeEntity('SF', 3)] }],
      });

    const rules: NerAnonymizationRule[] = [
      { type: 'ner', enabled: true, modelId: 'm1' } as any,
      { type: 'ner', enabled: true, modelId: 'm2' } as any,
    ];

    const output = await detectNamedEntities('NY SF', rules, mockLogger, esClientMock);
    const names = output.map((e) => e.entity).sort();
    expect(names).toEqual(['NY', 'SF']);

    // verify second call’s text no longer contains NY
    const secondCallDocs = inferStub.mock.calls[1][0].docs as Array<{ text_field: string }>;
    expect(secondCallDocs[0].text_field).not.toMatch(/NY/);

    expect(inferStub).toHaveBeenCalledTimes(2);
  });
});
