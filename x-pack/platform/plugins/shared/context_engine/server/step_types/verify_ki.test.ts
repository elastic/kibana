/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { coreMock, elasticsearchServiceMock, uiSettingsServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { KiVerifierRegistry } from '../ki_verification';
import type { KiVerifier } from '../ki_verification';
import type { VerifyKiStepDeps } from './verify_ki';
import { getVerifyKiStepDefinition } from './verify_ki';

const hasTitleVerifier: KiVerifier = {
  id: 'has-title',
  applies: () => true,
  verify: async (ki) =>
    ki.title ? { passed: true } : { passed: false, reason: 'KI has no title' },
};

const setupStep = ({ isEnabled = true }: { isEnabled?: boolean } = {}) => {
  const coreSetup = coreMock.createSetup();
  const coreStart = coreMock.createStart();
  const uiSettingsClient = uiSettingsServiceMock.createClient();
  uiSettingsClient.get.mockResolvedValue(isEnabled);
  coreStart.uiSettings.asScopedToClient.mockReturnValue(uiSettingsClient);
  coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}]);

  const registry = new KiVerifierRegistry();
  registry.register(hasTitleVerifier);

  const definition = getVerifyKiStepDefinition({
    coreSetup: coreSetup as unknown as VerifyKiStepDeps['coreSetup'],
    registry,
    logger: loggerMock.create(),
  });

  const esClient = elasticsearchServiceMock.createElasticsearchClient();

  const createContext = ({
    input,
    config,
  }: {
    input: { index: string; size?: number };
    config?: { verifiers?: string[] };
  }) =>
    ({
      input,
      config,
      rawInput: input,
      contextManager: {
        getScopedEsClient: () => esClient,
        getFakeRequest: () => ({}),
      },
      logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      abortSignal: new AbortController().signal,
      stepId: 'verify_kis',
      stepType: 'context-engine.verifyKi',
    } as unknown as Parameters<typeof definition.handler>[0]);

  return { definition, esClient, createContext };
};

const searchResponseWith = (hits: Array<{ _id: string; _source?: Record<string, unknown> }>) =>
  ({
    hits: { hits: hits.map((hit) => ({ ...hit, _index: 'test-index' })) },
  } as unknown as SearchResponse);

describe('verify KI workflow step', () => {
  it('throws a validation error when the Context Engine is disabled', async () => {
    const { definition, createContext } = setupStep({ isEnabled: false });

    await expect(
      definition.handler(createContext({ input: { index: 'test-index' } }))
    ).rejects.toThrow(/Context Engine is disabled/);
  });

  it('verifies each fetched KI and aggregates pass/fail counts', async () => {
    const { definition, esClient, createContext } = setupStep();
    esClient.search.mockResponse(
      searchResponseWith([
        { _id: '1', _source: { title: 'A titled KI' } },
        { _id: '2', _source: {} },
      ])
    );

    const result = await definition.handler(createContext({ input: { index: 'test-index' } }));

    expect(result.output).toEqual({
      total: 2,
      passed: 1,
      failed: 1,
      results: [
        {
          id: '1',
          title: 'A titled KI',
          passed: true,
          verifierResults: [{ verifier: 'has-title', passed: true }],
        },
        {
          id: '2',
          title: undefined,
          passed: false,
          verifierResults: [{ verifier: 'has-title', passed: false, reason: 'KI has no title' }],
        },
      ],
    });
  });

  it('throws a validation error for unknown verifier ids', async () => {
    const { definition, createContext } = setupStep();

    await expect(
      definition.handler(
        createContext({ input: { index: 'test-index' }, config: { verifiers: ['nope'] } })
      )
    ).rejects.toThrow(/Unknown KI verifier\(s\): nope/);
  });
});
