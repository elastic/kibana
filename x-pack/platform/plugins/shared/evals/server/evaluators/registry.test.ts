/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluatorDefinitionClient } from '../storage/evaluators/evaluator_definition_client';
import type { EvaluatorDefinitionDocument, LlmJudgeConfig } from './user_defined/types';
import { createEvaluatorRegistry } from './registry';

const JUDGE: LlmJudgeConfig = {
  prompt: 'Rate {{{agent_response}}}',
  system_prompt: 'Judge the response according to the supplied criteria.',
  evidence: ['response'],
  output: { scores: [{ name: 'tone', type: 'number' }] },
};

const storedDefinition = (
  overrides: Partial<EvaluatorDefinitionDocument> = {}
): EvaluatorDefinitionDocument => ({
  id: 'stored-id',
  name: 'tone',
  version: '1.0.0',
  kind: 'llm',
  description: 'Judges tone',
  judge: JUDGE,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const createDefinitionClient = (documents: EvaluatorDefinitionDocument[]) =>
  ({
    listLatest: jest.fn(async () => documents),
    getLatest: jest.fn(async (name: string) => documents.find((doc) => doc.name === name)),
    getVersion: jest.fn(async (name: string, version: string) =>
      documents.find((doc) => doc.name === name && doc.version === version)
    ),
  } as unknown as jest.Mocked<EvaluatorDefinitionClient>);

const createRegistry = (documents: EvaluatorDefinitionDocument[] = []) => {
  const definitionClient = createDefinitionClient(documents);
  const registry = createEvaluatorRegistry({ getDefinitionClient: () => definitionClient });

  return { registry, definitionClient, scoped: registry.asScoped({ spaceId: 'default' }) };
};

describe('createEvaluatorRegistry', () => {
  describe('built-ins', () => {
    it('lists the evaluators Kibana ships', async () => {
      const { scoped } = createRegistry();

      const names = (await scoped.list()).map(({ name }) => name);

      expect(names).toEqual(
        expect.arrayContaining([
          'correctness',
          'groundedness',
          'latency',
          'input_tokens',
          'output_tokens',
          'tool_calls',
        ])
      );
    });

    it('marks them as built-in', async () => {
      const { registry, scoped } = createRegistry();

      const correctness = await scoped.get('correctness');

      expect(correctness?.origin).toBe('built_in');
      expect(registry.isBuiltIn('correctness')).toBe(true);
      expect(registry.isBuiltIn('tone')).toBe(false);
    });

    it('declares compare polarity so ingested scores do not fall back to the name heuristic', async () => {
      const { scoped } = createRegistry([storedDefinition()]);
      const listed = await scoped.list();
      const directionByName = Object.fromEntries(
        listed.map(({ name, direction }) => [name, direction])
      );

      expect(directionByName).toEqual(
        expect.objectContaining({
          correctness: 'maximize',
          groundedness: 'maximize',
          latency: 'minimize',
          input_tokens: 'minimize',
          output_tokens: 'minimize',
          tool_calls: 'neutral',
          tone: 'maximize',
        })
      );
    });

    it('resolves without reaching the store', async () => {
      const { scoped, definitionClient } = createRegistry();

      await scoped.get('correctness');

      expect(definitionClient.getLatest).not.toHaveBeenCalled();
    });

    it('reports an unknown version of a known name as missing', async () => {
      const { scoped } = createRegistry();

      await expect(scoped.get('correctness', '99.0.0')).resolves.toBeUndefined();
    });
  });

  describe('persisted definitions', () => {
    it('lists them alongside the built-ins', async () => {
      const { scoped } = createRegistry([storedDefinition()]);

      const listed = await scoped.list();

      expect(listed).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'tone', origin: 'user_defined', version: '1.0.0' }),
          expect.objectContaining({ name: 'correctness', origin: 'built_in' }),
        ])
      );
    });

    it('compiles them into the same shape a built-in has', async () => {
      const { scoped } = createRegistry([storedDefinition()]);

      const tone = await scoped.get('tone');

      expect(tone).toEqual(
        expect.objectContaining({
          name: 'tone',
          version: '1.0.0',
          kind: 'llm',
          origin: 'user_defined',
          description: 'Judges tone',
          direction: 'maximize',
          evaluate: expect.any(Function),
        })
      );
    });

    it('resolves a pinned version', async () => {
      const { scoped, definitionClient } = createRegistry([
        storedDefinition({ version: '1.0.0' }),
        storedDefinition({ id: 'stored-id-2', version: '1.1.0' }),
      ]);

      await expect(scoped.get('tone', '1.0.0')).resolves.toEqual(
        expect.objectContaining({ version: '1.0.0' })
      );
      expect(definitionClient.getVersion).toHaveBeenCalledWith('tone', '1.0.0');
    });

    it('reports an unknown name as missing', async () => {
      const { scoped } = createRegistry();

      await expect(scoped.get('tone')).resolves.toBeUndefined();
    });

    it('reads the store for the space it was scoped to', async () => {
      const definitionClient = createDefinitionClient([]);
      const getDefinitionClient = jest.fn(() => definitionClient);
      const registry = createEvaluatorRegistry({ getDefinitionClient });

      await registry.asScoped({ spaceId: 'marketing' }).list();

      expect(getDefinitionClient).toHaveBeenCalledWith({ spaceId: 'marketing' });
    });
  });

  describe('built-in names cannot be shadowed', () => {
    // The create-time check refuses a built-in name, but a definition stored
    // before a built-in of that name shipped would have passed it.
    const shadowing = [storedDefinition({ name: 'correctness', description: 'Impostor' })];

    it('keeps the built-in when a stored definition claims its name', async () => {
      const { scoped } = createRegistry(shadowing);

      const correctness = await scoped.get('correctness');

      expect(correctness?.origin).toBe('built_in');
      expect(correctness?.description).not.toBe('Impostor');
    });

    it('does not fall through to the store for a pinned version either', async () => {
      const { scoped, definitionClient } = createRegistry(shadowing);

      // 1.0.0 exists under this name in both places; resolving it would return
      // the impostor if built-ins were only consulted for the latest version.
      await expect(scoped.get('correctness', '1.0.0')).resolves.toEqual(
        expect.objectContaining({ origin: 'built_in' })
      );
      expect(definitionClient.getVersion).not.toHaveBeenCalled();
    });

    it('drops it from the listing rather than reporting the name twice', async () => {
      const { scoped } = createRegistry(shadowing);

      const listed = await scoped.list();

      expect(listed.filter(({ name }) => name === 'correctness')).toEqual([
        expect.objectContaining({ origin: 'built_in' }),
      ]);
    });
  });

  describe('before the plugin has started', () => {
    it('serves built-ins when no store is available yet', async () => {
      const scoped = createEvaluatorRegistry().asScoped({ spaceId: 'default' });

      await expect(scoped.get('correctness')).resolves.toBeDefined();
      await expect(scoped.list()).resolves.not.toHaveLength(0);
      await expect(scoped.get('tone')).resolves.toBeUndefined();
    });
  });
});
