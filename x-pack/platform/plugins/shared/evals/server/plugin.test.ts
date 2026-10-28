/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import type { InferenceServerSetup, InferenceServerStart } from '@kbn/inference-plugin/server';
import type { RegisteredEvaluatorDefinition } from './evaluators/types';
import { EvalsPlugin } from './plugin';
import type { EvalsStartDependencies } from './types';

jest.mock('./storage/evaluators/evaluator_definition_service', () => ({
  EvaluatorDefinitionService: jest.fn().mockImplementation(() => ({
    getClient: () => ({ listLatest: async () => [] }),
  })),
}));

const RCA_QUALITY: RegisteredEvaluatorDefinition = {
  name: 'rca_quality',
  version: '1.0.0',
  kind: 'llm',
  description: 'Grades a root cause analysis',
  direction: 'maximize',
  evaluate: jest.fn(),
};

describe('EvalsPlugin', () => {
  const setup = (enabled = true) => {
    const plugin = new EvalsPlugin(coreMock.createPluginInitializerContext({ enabled }));
    const setupContract = plugin.setup(coreMock.createSetup(), {
      features: featuresPluginMock.createSetup(),
      encryptedSavedObjects: encryptedSavedObjectsMock.createSetup(),
      inference: {} as InferenceServerSetup,
    });
    const start = () =>
      plugin.start(coreMock.createStart(), {
        encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
        inference: {} as InferenceServerStart,
      } as EvalsStartDependencies);

    return { setupContract, start };
  };

  describe('registerEvaluator', () => {
    it('makes an evaluator registered during setup available once started', async () => {
      const { setupContract, start } = setup();

      setupContract.registerEvaluator(RCA_QUALITY);
      const evaluators = await start().listEvaluators?.({ spaceId: 'default' });

      expect(evaluators).toContainEqual(
        expect.objectContaining({ name: 'rca_quality', origin: 'built_in' })
      );
    });

    it('surfaces registry rejections to the caller', () => {
      const { setupContract } = setup();

      expect(() =>
        setupContract.registerEvaluator({ ...RCA_QUALITY, name: 'correctness' })
      ).toThrow('the name belongs to an evaluator that ships with Kibana');
    });

    it('throws when called after the plugin has started', () => {
      const { setupContract, start } = setup();

      start();

      expect(() => setupContract.registerEvaluator(RCA_QUALITY)).toThrow(
        'Cannot register evaluator "rca_quality": evaluators must be registered during setup'
      );
    });

    it('ignores registrations when the plugin is disabled', () => {
      const { setupContract } = setup(false);

      expect(setupContract.enabled).toBe(false);
      expect(() => setupContract.registerEvaluator(RCA_QUALITY)).not.toThrow();
    });
  });
});
