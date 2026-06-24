/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from '@kbn/streams-schema';
import { DefinitionNotFoundError } from '../errors/definition_not_found_error';
import type { KnowledgeIndicatorClient } from '../ki';
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
    ...overrides,
  } as Feature);

const buildStreamDef = (name: string) =>
  ({ name } as Awaited<ReturnType<StreamsClient['listStreams']>>[number]);

const buildClients = () => {
  const knowledgeIndicatorClient = {
    getFeatures: jest.fn(),
  } as unknown as jest.Mocked<Pick<KnowledgeIndicatorClient, 'getFeatures'>> &
    KnowledgeIndicatorClient;

  const streamsClient = {
    listStreams: jest.fn(),
    getStream: jest.fn(),
  } as unknown as jest.Mocked<Pick<StreamsClient, 'listStreams' | 'getStream'>> & StreamsClient;

  return { knowledgeIndicatorClient, streamsClient };
};

describe('createKnowledgeIndicatorsReader', () => {
  describe('listEntityFeatures', () => {
    it('returns an empty array without calling the KI client when there are no streams', async () => {
      const { knowledgeIndicatorClient, streamsClient } = buildClients();
      streamsClient.listStreams.mockResolvedValue([]);

      const reader = createKnowledgeIndicatorsReader({ knowledgeIndicatorClient, streamsClient });
      const result = await reader.listEntityFeatures();

      expect(result).toEqual([]);
      expect(knowledgeIndicatorClient.getFeatures).not.toHaveBeenCalled();
    });

    it("forwards every stream name and hardwires type=['entity'] to the underlying client", async () => {
      const { knowledgeIndicatorClient, streamsClient } = buildClients();
      streamsClient.listStreams.mockResolvedValue([
        buildStreamDef('logs.k8s.pods'),
        buildStreamDef('logs.ecs.nginx'),
      ]);
      const features = [buildFeature(), buildFeature({ stream_name: 'logs.ecs.nginx' })];
      knowledgeIndicatorClient.getFeatures.mockResolvedValue({ hits: features });

      const reader = createKnowledgeIndicatorsReader({ knowledgeIndicatorClient, streamsClient });
      const result = await reader.listEntityFeatures();

      expect(result).toEqual(features);
      expect(knowledgeIndicatorClient.getFeatures).toHaveBeenCalledTimes(1);
      expect(knowledgeIndicatorClient.getFeatures).toHaveBeenCalledWith(
        ['logs.k8s.pods', 'logs.ecs.nginx'],
        expect.objectContaining({
          type: ['entity'],
          minConfidence: undefined,
        })
      );
    });

    it('pushes minConfidence into the underlying query', async () => {
      const { knowledgeIndicatorClient, streamsClient } = buildClients();
      streamsClient.listStreams.mockResolvedValue([buildStreamDef('logs.k8s.pods')]);
      knowledgeIndicatorClient.getFeatures.mockResolvedValue({ hits: [] });

      const reader = createKnowledgeIndicatorsReader({ knowledgeIndicatorClient, streamsClient });
      await reader.listEntityFeatures({ minConfidence: 70 });

      expect(knowledgeIndicatorClient.getFeatures).toHaveBeenCalledWith(
        ['logs.k8s.pods'],
        expect.objectContaining({ type: ['entity'], minConfidence: 70 })
      );
    });

    it('does not pass limit or includeExcluded to the underlying client (narrowed surface)', async () => {
      const { knowledgeIndicatorClient, streamsClient } = buildClients();
      streamsClient.listStreams.mockResolvedValue([buildStreamDef('logs.k8s.pods')]);
      knowledgeIndicatorClient.getFeatures.mockResolvedValue({ hits: [] });

      const reader = createKnowledgeIndicatorsReader({ knowledgeIndicatorClient, streamsClient });
      await reader.listEntityFeatures();

      const optionsArg = knowledgeIndicatorClient.getFeatures.mock.calls[0][1];
      expect(optionsArg).not.toHaveProperty('limit');
      expect(optionsArg).not.toHaveProperty('includeExcluded');
    });

    it('propagates underlying errors so callers can decide how to handle them', async () => {
      const { knowledgeIndicatorClient, streamsClient } = buildClients();
      streamsClient.listStreams.mockResolvedValue([buildStreamDef('logs.k8s.pods')]);
      const failure = new Error('boom');
      knowledgeIndicatorClient.getFeatures.mockRejectedValue(failure);

      const reader = createKnowledgeIndicatorsReader({ knowledgeIndicatorClient, streamsClient });
      await expect(reader.listEntityFeatures()).rejects.toBe(failure);
    });
  });

  describe('listDependencyFeatures', () => {
    it("hardwires type=['dependency'] to the underlying client", async () => {
      const { knowledgeIndicatorClient, streamsClient } = buildClients();
      streamsClient.listStreams.mockResolvedValue([buildStreamDef('logs.k8s.pods')]);
      const dep = buildFeature({
        type: 'dependency',
        subtype: 'service-to-service',
        properties: { source: 'a', target: 'b', protocol: 'http' },
      });
      knowledgeIndicatorClient.getFeatures.mockResolvedValue({ hits: [dep] });

      const reader = createKnowledgeIndicatorsReader({ knowledgeIndicatorClient, streamsClient });
      const result = await reader.listDependencyFeatures({ minConfidence: 80 });

      expect(result).toEqual([dep]);
      expect(knowledgeIndicatorClient.getFeatures).toHaveBeenCalledWith(
        ['logs.k8s.pods'],
        expect.objectContaining({ type: ['dependency'], minConfidence: 80 })
      );
    });

    it('returns an empty array without calling the KI client when there are no streams', async () => {
      const { knowledgeIndicatorClient, streamsClient } = buildClients();
      streamsClient.listStreams.mockResolvedValue([]);

      const reader = createKnowledgeIndicatorsReader({ knowledgeIndicatorClient, streamsClient });
      const result = await reader.listDependencyFeatures();

      expect(result).toEqual([]);
      expect(knowledgeIndicatorClient.getFeatures).not.toHaveBeenCalled();
    });
  });

  describe('listSchemaFeatures', () => {
    it("hardwires type=['schema'] to the underlying client", async () => {
      const { knowledgeIndicatorClient, streamsClient } = buildClients();
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
      knowledgeIndicatorClient.getFeatures.mockResolvedValue({ hits: [schemaFeature] });

      const reader = createKnowledgeIndicatorsReader({ knowledgeIndicatorClient, streamsClient });
      const result = await reader.listSchemaFeatures({ minConfidence: 85 });

      expect(result).toEqual([schemaFeature]);
      expect(knowledgeIndicatorClient.getFeatures).toHaveBeenCalledWith(
        ['logs.azure.signinlogs'],
        expect.objectContaining({ type: ['schema'], minConfidence: 85 })
      );
    });

    it('returns an empty array without calling the KI client when there are no streams', async () => {
      const { knowledgeIndicatorClient, streamsClient } = buildClients();
      streamsClient.listStreams.mockResolvedValue([]);

      const reader = createKnowledgeIndicatorsReader({ knowledgeIndicatorClient, streamsClient });
      const result = await reader.listSchemaFeatures();

      expect(result).toEqual([]);
      expect(knowledgeIndicatorClient.getFeatures).not.toHaveBeenCalled();
    });

    it('omits minConfidence when the caller does not pass it', async () => {
      const { knowledgeIndicatorClient, streamsClient } = buildClients();
      streamsClient.listStreams.mockResolvedValue([buildStreamDef('logs.azure.signinlogs')]);
      knowledgeIndicatorClient.getFeatures.mockResolvedValue({ hits: [] });

      const reader = createKnowledgeIndicatorsReader({ knowledgeIndicatorClient, streamsClient });
      await reader.listSchemaFeatures();

      expect(knowledgeIndicatorClient.getFeatures).toHaveBeenCalledWith(
        ['logs.azure.signinlogs'],
        expect.objectContaining({ type: ['schema'], minConfidence: undefined })
      );
    });
  });

  it('list*Features methods never share a call (independent type scope)', async () => {
    const { knowledgeIndicatorClient, streamsClient } = buildClients();
    streamsClient.listStreams.mockResolvedValue([buildStreamDef('logs.k8s.pods')]);
    knowledgeIndicatorClient.getFeatures.mockResolvedValue({ hits: [] });

    const reader = createKnowledgeIndicatorsReader({ knowledgeIndicatorClient, streamsClient });
    await reader.listEntityFeatures();
    await reader.listDependencyFeatures();
    await reader.listSchemaFeatures();

    expect(knowledgeIndicatorClient.getFeatures).toHaveBeenCalledTimes(3);
    expect(knowledgeIndicatorClient.getFeatures.mock.calls[0][1]?.type).toEqual(['entity']);
    expect(knowledgeIndicatorClient.getFeatures.mock.calls[1][1]?.type).toEqual(['dependency']);
    expect(knowledgeIndicatorClient.getFeatures.mock.calls[2][1]?.type).toEqual(['schema']);
  });

  describe('resolveIndexPatterns', () => {
    it('returns [streamName] for an existing wired stream', async () => {
      const { knowledgeIndicatorClient, streamsClient } = buildClients();
      streamsClient.getStream.mockResolvedValue({ name: 'logs.k8s.pods' } as Awaited<
        ReturnType<StreamsClient['getStream']>
      >);

      const reader = createKnowledgeIndicatorsReader({ knowledgeIndicatorClient, streamsClient });
      const patterns = await reader.resolveIndexPatterns('logs.k8s.pods');

      expect(patterns).toEqual(['logs.k8s.pods']);
      expect(streamsClient.getStream).toHaveBeenCalledWith('logs.k8s.pods');
    });

    it('returns [streamName] for an existing classic (unmanaged) stream too', async () => {
      const { knowledgeIndicatorClient, streamsClient } = buildClients();
      // Classic streams are returned through the same getStream() path
      // (resolved via getDataStreamAsIngestStream); we don't need to know
      // the variant to compute the index pattern.
      streamsClient.getStream.mockResolvedValue({ name: 'metrics.classic' } as Awaited<
        ReturnType<StreamsClient['getStream']>
      >);

      const reader = createKnowledgeIndicatorsReader({ knowledgeIndicatorClient, streamsClient });
      const patterns = await reader.resolveIndexPatterns('metrics.classic');

      expect(patterns).toEqual(['metrics.classic']);
    });

    it('returns an empty array when the stream cannot be found, without throwing', async () => {
      const { knowledgeIndicatorClient, streamsClient } = buildClients();
      streamsClient.getStream.mockRejectedValue(new DefinitionNotFoundError('not found'));

      const reader = createKnowledgeIndicatorsReader({ knowledgeIndicatorClient, streamsClient });
      const patterns = await reader.resolveIndexPatterns('logs.does-not-exist');

      expect(patterns).toEqual([]);
    });

    it('propagates non-not-found errors (e.g. permission errors) to the caller', async () => {
      const { knowledgeIndicatorClient, streamsClient } = buildClients();
      const failure = new Error('insufficient privileges');
      streamsClient.getStream.mockRejectedValue(failure);

      const reader = createKnowledgeIndicatorsReader({ knowledgeIndicatorClient, streamsClient });
      await expect(reader.resolveIndexPatterns('logs.private')).rejects.toBe(failure);
    });
  });
});
