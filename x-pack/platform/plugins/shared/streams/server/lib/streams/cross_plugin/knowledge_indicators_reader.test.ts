/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureClient } from '../feature/feature_client';
import type { StreamsClient } from '../client';
import { DefinitionNotFoundError } from '../errors/definition_not_found_error';
import { createKnowledgeIndicatorsReader } from './knowledge_indicators_reader';

const makeStreamsClient = (
  streamNames: string[],
  getStreamImpl?: (name: string) => Promise<unknown>
): StreamsClient =>
  ({
    listStreams: jest.fn(async () => streamNames.map((name) => ({ name }))),
    getStream: jest.fn(getStreamImpl ?? (async () => ({}))),
  } as unknown as StreamsClient);

const makeFeatureClient = (hits: unknown[] = []): FeatureClient =>
  ({
    getFeatures: jest.fn(async () => ({ hits, total: hits.length })),
  } as unknown as FeatureClient);

describe('createKnowledgeIndicatorsReader', () => {
  it('pushes the schema type + minConfidence into the feature query', async () => {
    const streamsClient = makeStreamsClient(['logs.a', 'logs.b']);
    const featureClient = makeFeatureClient([{ uuid: 'x' }]);
    const reader = createKnowledgeIndicatorsReader({ featureClient, streamsClient });

    const result = await reader.listSchemaFeatures({ minConfidence: 60 });

    expect(streamsClient.listStreams).toHaveBeenCalledTimes(1);
    expect(featureClient.getFeatures).toHaveBeenCalledWith(['logs.a', 'logs.b'], {
      type: ['schema'],
      minConfidence: 60,
    });
    expect(result).toEqual([{ uuid: 'x' }]);
  });

  it('returns [] without querying features when there are no streams', async () => {
    const streamsClient = makeStreamsClient([]);
    const featureClient = makeFeatureClient();
    const reader = createKnowledgeIndicatorsReader({ featureClient, streamsClient });

    expect(await reader.listEntityFeatures()).toEqual([]);
    expect(featureClient.getFeatures).not.toHaveBeenCalled();
  });

  it('resolves a present stream to a single-element pattern array', async () => {
    const streamsClient = makeStreamsClient(['logs.a']);
    const reader = createKnowledgeIndicatorsReader({
      featureClient: makeFeatureClient(),
      streamsClient,
    });
    expect(await reader.resolveIndexPatterns('logs.a')).toEqual(['logs.a']);
  });

  it('returns [] for a missing stream instead of throwing', async () => {
    const streamsClient = makeStreamsClient(['logs.a'], async () => {
      throw new DefinitionNotFoundError('nope');
    });
    const reader = createKnowledgeIndicatorsReader({
      featureClient: makeFeatureClient(),
      streamsClient,
    });
    expect(await reader.resolveIndexPatterns('logs.gone')).toEqual([]);
  });

  it('rethrows non-not-found errors from getStream', async () => {
    const streamsClient = makeStreamsClient(['logs.a'], async () => {
      throw new Error('boom');
    });
    const reader = createKnowledgeIndicatorsReader({
      featureClient: makeFeatureClient(),
      streamsClient,
    });
    await expect(reader.resolveIndexPatterns('logs.a')).rejects.toThrow('boom');
  });
});
