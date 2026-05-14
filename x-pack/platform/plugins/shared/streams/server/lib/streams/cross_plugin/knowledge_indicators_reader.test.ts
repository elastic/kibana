/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from '@kbn/streams-schema';
import { DefinitionNotFoundError } from '../errors/definition_not_found_error';
import type { FeatureClient } from '../feature/feature_client';
import type { StreamsClient } from '../client';
import { createKnowledgeIndicatorsReader } from './knowledge_indicators_reader';

const buildFeature = (overrides: Partial<Feature> = {}): Feature =>
  ({
    uuid: 'u',
    id: 'f',
    stream_name: 'logs.k8s.pods',
    type: 'entity',
    subtype: 'service',
    title: 'svc',
    description: 'desc',
    properties: {},
    confidence: 90,
    status: 'active',
    last_seen: '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as Feature);

const buildStreamDef = (name: string) =>
  ({ name } as Awaited<ReturnType<StreamsClient['listStreams']>>[number]);

const buildClients = () => {
  const featureClient = {
    getFeatures: jest.fn(),
  } as unknown as jest.Mocked<Pick<FeatureClient, 'getFeatures'>> & FeatureClient;

  const streamsClient = {
    listStreams: jest.fn(),
    getStream: jest.fn(),
  } as unknown as jest.Mocked<Pick<StreamsClient, 'listStreams' | 'getStream'>> & StreamsClient;

  return { featureClient, streamsClient };
};

describe('createKnowledgeIndicatorsReader', () => {
  describe('listEntityFeatures', () => {
    it('returns an empty array without calling the feature client when there are no streams', async () => {
      const { featureClient, streamsClient } = buildClients();
      streamsClient.listStreams.mockResolvedValue([]);

      const reader = createKnowledgeIndicatorsReader({ featureClient, streamsClient });
      const result = await reader.listEntityFeatures();

      expect(result).toEqual([]);
      expect(featureClient.getFeatures).not.toHaveBeenCalled();
    });

    it("forwards every stream name and hardwires type=['entity'] to the underlying client", async () => {
      const { featureClient, streamsClient } = buildClients();
      streamsClient.listStreams.mockResolvedValue([
        buildStreamDef('logs.k8s.pods'),
        buildStreamDef('logs.ecs.nginx'),
      ]);
      const features = [buildFeature(), buildFeature({ stream_name: 'logs.ecs.nginx' })];
      featureClient.getFeatures.mockResolvedValue({ hits: features, total: features.length });

      const reader = createKnowledgeIndicatorsReader({ featureClient, streamsClient });
      const result = await reader.listEntityFeatures();

      expect(result).toEqual(features);
      expect(featureClient.getFeatures).toHaveBeenCalledTimes(1);
      expect(featureClient.getFeatures).toHaveBeenCalledWith(
        ['logs.k8s.pods', 'logs.ecs.nginx'],
        expect.objectContaining({
          type: ['entity'],
          minConfidence: undefined,
        })
      );
    });

    it('pushes minConfidence into the underlying query', async () => {
      const { featureClient, streamsClient } = buildClients();
      streamsClient.listStreams.mockResolvedValue([buildStreamDef('logs.k8s.pods')]);
      featureClient.getFeatures.mockResolvedValue({ hits: [], total: 0 });

      const reader = createKnowledgeIndicatorsReader({ featureClient, streamsClient });
      await reader.listEntityFeatures({ minConfidence: 70 });

      expect(featureClient.getFeatures).toHaveBeenCalledWith(
        ['logs.k8s.pods'],
        expect.objectContaining({ type: ['entity'], minConfidence: 70 })
      );
    });

    it('does not pass limit or includeExcluded to the underlying client (narrowed surface)', async () => {
      const { featureClient, streamsClient } = buildClients();
      streamsClient.listStreams.mockResolvedValue([buildStreamDef('logs.k8s.pods')]);
      featureClient.getFeatures.mockResolvedValue({ hits: [], total: 0 });

      const reader = createKnowledgeIndicatorsReader({ featureClient, streamsClient });
      await reader.listEntityFeatures();

      const optionsArg = featureClient.getFeatures.mock.calls[0][1];
      expect(optionsArg).not.toHaveProperty('limit');
      expect(optionsArg).not.toHaveProperty('includeExcluded');
    });

    it('propagates underlying errors so callers can decide how to handle them', async () => {
      const { featureClient, streamsClient } = buildClients();
      streamsClient.listStreams.mockResolvedValue([buildStreamDef('logs.k8s.pods')]);
      const failure = new Error('boom');
      featureClient.getFeatures.mockRejectedValue(failure);

      const reader = createKnowledgeIndicatorsReader({ featureClient, streamsClient });
      await expect(reader.listEntityFeatures()).rejects.toBe(failure);
    });
  });

  describe('listDependencyFeatures', () => {
    it("hardwires type=['dependency'] to the underlying client", async () => {
      const { featureClient, streamsClient } = buildClients();
      streamsClient.listStreams.mockResolvedValue([buildStreamDef('logs.k8s.pods')]);
      const dep = buildFeature({
        type: 'dependency',
        subtype: 'service-to-service',
        properties: { source: 'a', target: 'b', protocol: 'http' },
      });
      featureClient.getFeatures.mockResolvedValue({ hits: [dep], total: 1 });

      const reader = createKnowledgeIndicatorsReader({ featureClient, streamsClient });
      const result = await reader.listDependencyFeatures({ minConfidence: 80 });

      expect(result).toEqual([dep]);
      expect(featureClient.getFeatures).toHaveBeenCalledWith(
        ['logs.k8s.pods'],
        expect.objectContaining({ type: ['dependency'], minConfidence: 80 })
      );
    });

    it('returns an empty array without calling the feature client when there are no streams', async () => {
      const { featureClient, streamsClient } = buildClients();
      streamsClient.listStreams.mockResolvedValue([]);

      const reader = createKnowledgeIndicatorsReader({ featureClient, streamsClient });
      const result = await reader.listDependencyFeatures();

      expect(result).toEqual([]);
      expect(featureClient.getFeatures).not.toHaveBeenCalled();
    });
  });

  describe('listSchemaFeatures', () => {
    it("hardwires type=['schema'] to the underlying client", async () => {
      const { featureClient, streamsClient } = buildClients();
      streamsClient.listStreams.mockResolvedValue([buildStreamDef('logs.azure.signinlogs')]);
      const schemaFeature = buildFeature({
        type: 'schema',
        subtype: 'custom',
        stream_name: 'logs.azure.signinlogs',
        properties: {
          schema_family: 'custom',
          ecs_identity_aliases: {
            'user.email': ['azure.signinlogs.properties.user_principal_name'],
          },
        },
      });
      featureClient.getFeatures.mockResolvedValue({ hits: [schemaFeature], total: 1 });

      const reader = createKnowledgeIndicatorsReader({ featureClient, streamsClient });
      const result = await reader.listSchemaFeatures({ minConfidence: 85 });

      expect(result).toEqual([schemaFeature]);
      expect(featureClient.getFeatures).toHaveBeenCalledWith(
        ['logs.azure.signinlogs'],
        expect.objectContaining({ type: ['schema'], minConfidence: 85 })
      );
    });

    it('returns an empty array without calling the feature client when there are no streams', async () => {
      const { featureClient, streamsClient } = buildClients();
      streamsClient.listStreams.mockResolvedValue([]);

      const reader = createKnowledgeIndicatorsReader({ featureClient, streamsClient });
      const result = await reader.listSchemaFeatures();

      expect(result).toEqual([]);
      expect(featureClient.getFeatures).not.toHaveBeenCalled();
    });

    it('omits minConfidence when the caller does not pass it', async () => {
      const { featureClient, streamsClient } = buildClients();
      streamsClient.listStreams.mockResolvedValue([buildStreamDef('logs.azure.signinlogs')]);
      featureClient.getFeatures.mockResolvedValue({ hits: [], total: 0 });

      const reader = createKnowledgeIndicatorsReader({ featureClient, streamsClient });
      await reader.listSchemaFeatures();

      expect(featureClient.getFeatures).toHaveBeenCalledWith(
        ['logs.azure.signinlogs'],
        expect.objectContaining({ type: ['schema'], minConfidence: undefined })
      );
    });
  });

  it('list*Features methods never share a call (independent type scope)', async () => {
    const { featureClient, streamsClient } = buildClients();
    streamsClient.listStreams.mockResolvedValue([buildStreamDef('logs.k8s.pods')]);
    featureClient.getFeatures.mockResolvedValue({ hits: [], total: 0 });

    const reader = createKnowledgeIndicatorsReader({ featureClient, streamsClient });
    await reader.listEntityFeatures();
    await reader.listDependencyFeatures();
    await reader.listSchemaFeatures();

    expect(featureClient.getFeatures).toHaveBeenCalledTimes(3);
    expect(featureClient.getFeatures.mock.calls[0][1]?.type).toEqual(['entity']);
    expect(featureClient.getFeatures.mock.calls[1][1]?.type).toEqual(['dependency']);
    expect(featureClient.getFeatures.mock.calls[2][1]?.type).toEqual(['schema']);
  });

  describe('resolveIndexPatterns', () => {
    it('returns [streamName] for an existing wired stream', async () => {
      const { featureClient, streamsClient } = buildClients();
      streamsClient.getStream.mockResolvedValue({ name: 'logs.k8s.pods' } as Awaited<
        ReturnType<StreamsClient['getStream']>
      >);

      const reader = createKnowledgeIndicatorsReader({ featureClient, streamsClient });
      const patterns = await reader.resolveIndexPatterns('logs.k8s.pods');

      expect(patterns).toEqual(['logs.k8s.pods']);
      expect(streamsClient.getStream).toHaveBeenCalledWith('logs.k8s.pods');
    });

    it('returns [streamName] for an existing classic (unmanaged) stream too', async () => {
      const { featureClient, streamsClient } = buildClients();
      // Classic streams are returned through the same getStream() path
      // (resolved via getDataStreamAsIngestStream); we don't need to know
      // the variant to compute the index pattern.
      streamsClient.getStream.mockResolvedValue({ name: 'metrics.classic' } as Awaited<
        ReturnType<StreamsClient['getStream']>
      >);

      const reader = createKnowledgeIndicatorsReader({ featureClient, streamsClient });
      const patterns = await reader.resolveIndexPatterns('metrics.classic');

      expect(patterns).toEqual(['metrics.classic']);
    });

    it('returns an empty array when the stream cannot be found, without throwing', async () => {
      const { featureClient, streamsClient } = buildClients();
      streamsClient.getStream.mockRejectedValue(new DefinitionNotFoundError('not found'));

      const reader = createKnowledgeIndicatorsReader({ featureClient, streamsClient });
      const patterns = await reader.resolveIndexPatterns('logs.does-not-exist');

      expect(patterns).toEqual([]);
    });

    it('propagates non-not-found errors (e.g. permission errors) to the caller', async () => {
      const { featureClient, streamsClient } = buildClients();
      const failure = new Error('insufficient privileges');
      streamsClient.getStream.mockRejectedValue(failure);

      const reader = createKnowledgeIndicatorsReader({ featureClient, streamsClient });
      await expect(reader.resolveIndexPatterns('logs.private')).rejects.toBe(failure);
    });
  });
});
