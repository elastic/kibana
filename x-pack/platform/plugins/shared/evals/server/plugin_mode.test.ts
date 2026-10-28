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
import { configSchema, type EvalsConfig } from './config';
import { EvalsPlugin } from './plugin';
import type { RegisteredEvaluatorDefinition } from './evaluators/types';
import type { EvalsPluginSetup, EvalsSetupDependencies, EvalsStartDependencies } from './types';

const RCA_QUALITY: RegisteredEvaluatorDefinition = {
  name: 'nightshift_rca_quality',
  version: '1.0.0',
  kind: 'llm',
  description: 'Grades a root cause analysis',
  direction: 'maximize',
  evaluate: jest.fn(),
};

describe('EvalsPlugin modes', () => {
  const setup = (
    config: Partial<EvalsConfig>,
    beforeStart: (setupContract: EvalsPluginSetup) => void = () => {}
  ) => {
    const plugin = new EvalsPlugin(
      coreMock.createPluginInitializerContext({ enabled: true, mode: 'runtime', ...config })
    );
    const coreSetup = coreMock.createSetup();
    const features = featuresPluginMock.createSetup();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup();
    const workflowsExtensions = { registerStepDefinition: jest.fn() };

    const setupContract = plugin.setup(coreSetup, {
      features,
      encryptedSavedObjects,
      inference: {} as InferenceServerSetup,
      workflowsExtensions,
    } as unknown as EvalsSetupDependencies);
    beforeStart(setupContract);
    const startContract = plugin.start(coreMock.createStart(), {
      encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
      inference: {} as InferenceServerStart,
    } as EvalsStartDependencies);

    return {
      setupContract,
      startContract,
      coreSetup,
      features,
      encryptedSavedObjects,
      workflowsExtensions,
    };
  };

  describe('runtime', () => {
    it('is accepted alongside full, and no other mode is', () => {
      expect(configSchema.validate({ enabled: true, mode: 'runtime' }).mode).toBe('runtime');
      expect(() => configSchema.validate({ enabled: true, mode: 'ui' })).toThrow();
    });

    it('loads no routes, feature, data streams, saved objects or workflow steps', () => {
      const { coreSetup, features, encryptedSavedObjects, workflowsExtensions } = setup({
        mode: 'runtime',
      });

      expect(coreSetup.http.createRouter).not.toHaveBeenCalled();
      expect(coreSetup.http.registerRouteHandlerContext).not.toHaveBeenCalled();
      expect(features.registerKibanaFeature).not.toHaveBeenCalled();
      expect(coreSetup.dataStreams.registerDataStream).not.toHaveBeenCalled();
      expect(coreSetup.savedObjects.registerType).not.toHaveBeenCalled();
      expect(encryptedSavedObjects.registerType).not.toHaveBeenCalled();
      expect(workflowsExtensions.registerStepDefinition).not.toHaveBeenCalled();
    });

    it('reports its mode and exposes no product services', () => {
      const { setupContract, startContract } = setup({ mode: 'runtime' });

      expect(setupContract).toEqual(expect.objectContaining({ enabled: true, mode: 'runtime' }));
      expect(startContract.datasetService).toBeUndefined();
      expect(startContract.evaluationScoreService).toBeUndefined();
      expect(startContract.onlineScoreService).toBeUndefined();
      expect(startContract.listEvaluators).toBeUndefined();
    });

    it('exposes evaluate(), which in-process callers such as Nightshift use', () => {
      const { startContract } = setup({ mode: 'runtime' });

      expect(startContract.evaluate).toEqual(expect.any(Function));
    });

    it('accepts evaluators registered during setup and refuses them after start', () => {
      const { setupContract } = setup({ mode: 'runtime' }, (contract) => {
        expect(() => contract.registerEvaluator(RCA_QUALITY)).not.toThrow();
        // The registry's own validation runs, so registration reaches the real registry.
        expect(() => contract.registerEvaluator({ ...RCA_QUALITY, name: 'correctness' })).toThrow(
          'the name belongs to an evaluator that ships with Kibana'
        );
      });

      expect(() => setupContract.registerEvaluator({ ...RCA_QUALITY, version: '2.0.0' })).toThrow(
        'evaluators must be registered during setup'
      );
    });
  });

  describe('full', () => {
    it('is the default', () => {
      expect(configSchema.validate({ enabled: true }).mode).toBe('full');
    });

    it('loads routes, the feature, data streams, saved objects and workflow steps', () => {
      const { coreSetup, features, encryptedSavedObjects, workflowsExtensions } = setup({
        mode: 'full',
      });

      expect(coreSetup.http.createRouter).toHaveBeenCalled();
      expect(coreSetup.http.registerRouteHandlerContext).toHaveBeenCalledWith(
        'evals',
        expect.any(Function)
      );
      expect(features.registerKibanaFeature).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'evals' })
      );
      expect(coreSetup.dataStreams.registerDataStream).toHaveBeenCalledTimes(2);
      expect(coreSetup.savedObjects.registerType).toHaveBeenCalled();
      expect(encryptedSavedObjects.registerType).toHaveBeenCalled();
      expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalled();
    });

    it('reports its mode and exposes the product services', () => {
      const { setupContract, startContract } = setup({ mode: 'full' });

      expect(setupContract).toEqual(expect.objectContaining({ enabled: true, mode: 'full' }));
      expect(startContract.datasetService).toBeDefined();
      expect(startContract.listEvaluators).toBeDefined();
      expect(startContract.evaluate).toEqual(expect.any(Function));
    });
  });

  it('loads nothing when disabled, whatever the mode', () => {
    const { setupContract, startContract, coreSetup, features } = setup({
      enabled: false,
      mode: 'full',
    });

    expect(setupContract).toEqual(expect.objectContaining({ enabled: false }));
    expect(startContract).toEqual({});
    expect(coreSetup.http.createRouter).not.toHaveBeenCalled();
    expect(features.registerKibanaFeature).not.toHaveBeenCalled();
  });
});
