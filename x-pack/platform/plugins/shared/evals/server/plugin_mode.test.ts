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
import type { EvalsSetupDependencies, EvalsStartDependencies } from './types';

describe('EvalsPlugin modes', () => {
  const setup = (config: Partial<EvalsConfig>) => {
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
    it('is the default, and no other mode is accepted', () => {
      expect(configSchema.validate({ enabled: true }).mode).toBe('runtime');
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
  });

  describe('full', () => {
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
