/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/server/mocks';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import { StreamsPlugin } from './plugin';
import type { StreamsConfig } from '../common/config';
import type { StreamsPluginSetupDependencies } from './types';

jest.mock('./agent_builder/register', () => ({
  registerStreamsAgentBuilder: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('./lib/saved_objects/register_saved_objects', () => ({
  registerStreamsSavedObjects: jest.fn(),
}));
jest.mock('./register_fields_metadata_extractors', () => ({
  registerFieldsMetadataExtractors: jest.fn(),
}));
jest.mock('./register_suggestions_inference_features', () => ({
  registerSuggestionsInferenceFeatures: jest.fn(),
}));
jest.mock('./feature_flags', () => ({ registerFeatureFlags: jest.fn() }));

const { registerStreamsAgentBuilder } = jest.requireMock('./agent_builder/register');

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

function getConfig(overrides: Partial<StreamsConfig> = {}): StreamsConfig {
  return {
    canvas: { enabled: false },
    distributor: { ssl: {} },
    preconfigured: { enabled: false, stream_definitions: [] },
    workers: {
      patternExtraction: {
        enabled: false,
        minThreads: 0,
        maxThreads: 1,
        maxQueue: 10,
        idleTimeout: 30000,
        taskTimeout: 30000,
      },
    },
    ...overrides,
  } as StreamsConfig;
}

function createPluginsSetup(): jest.Mocked<StreamsPluginSetupDependencies> {
  return {
    encryptedSavedObjects: { canEncrypt: false, registerType: jest.fn() } as unknown as
      StreamsPluginSetupDependencies['encryptedSavedObjects'],
    alerting: alertsMock.createSetup(),
    ruleRegistry: { registerType: jest.fn() } as unknown as
      StreamsPluginSetupDependencies['ruleRegistry'],
    features: featuresPluginMock.createSetup(),
    usageCollection: usageCollectionPluginMock.createSetupContract(),
    fieldsMetadata: { registerIntegrationFieldsExtractor: jest.fn() } as unknown as
      StreamsPluginSetupDependencies['fieldsMetadata'],
  } as unknown as jest.Mocked<StreamsPluginSetupDependencies>;
}

describe('StreamsPlugin agent builder registration gating', () => {
  let context: PluginInitializerContext<StreamsConfig>;
  let plugin: StreamsPlugin;
  let coreSetup: ReturnType<typeof coreMock.createSetup>;
  let pluginsSetup: jest.Mocked<StreamsPluginSetupDependencies>;

  const createServerlessContext = () => {
    const ctx = coreMock.createPluginInitializerContext<StreamsConfig>(getConfig());
    Object.defineProperty(ctx.env, 'packageInfo', {
      value: { ...ctx.env.packageInfo, buildFlavor: 'serverless' as const },
    });
    return ctx;
  };

  const setupServerlessPlugin = (projectType: string | undefined) => {
    context = createServerlessContext();
    plugin = new StreamsPlugin(context);
    pluginsSetup.cloud = {
      isServerlessEnabled: true,
      serverless: { projectType },
    } as StreamsPluginSetupDependencies['cloud'];
  };

  beforeEach(() => {
    jest.clearAllMocks();
    context = coreMock.createPluginInitializerContext<StreamsConfig>(getConfig());
    plugin = new StreamsPlugin(context);
    coreSetup = coreMock.createSetup();
    pluginsSetup = createPluginsSetup();
    pluginsSetup.agentBuilder = {} as NonNullable<StreamsPluginSetupDependencies['agentBuilder']>;
  });

  it('registers agent builder when not in serverless', async () => {
    plugin.setup(coreSetup, pluginsSetup);
    await flushPromises();

    expect(registerStreamsAgentBuilder).toHaveBeenCalled();
  });

  it('registers agent builder for serverless observability projects', async () => {
    setupServerlessPlugin('observability');
    plugin.setup(coreSetup, pluginsSetup);
    await flushPromises();

    expect(registerStreamsAgentBuilder).toHaveBeenCalled();
  });

  it('registers agent builder for serverless security projects', async () => {
    setupServerlessPlugin('security');
    plugin.setup(coreSetup, pluginsSetup);
    await flushPromises();

    expect(registerStreamsAgentBuilder).toHaveBeenCalled();
  });

  it('does not register agent builder for serverless es projects', async () => {
    setupServerlessPlugin('es');
    plugin.setup(coreSetup, pluginsSetup);
    await flushPromises();

    expect(registerStreamsAgentBuilder).not.toHaveBeenCalled();
  });

  it('does not register agent builder for serverless vectordb projects', async () => {
    setupServerlessPlugin('vectordb');
    plugin.setup(coreSetup, pluginsSetup);
    await flushPromises();

    expect(registerStreamsAgentBuilder).not.toHaveBeenCalled();
  });

  it('does not register agent builder when serverless project type is undefined', async () => {
    setupServerlessPlugin(undefined);
    plugin.setup(coreSetup, pluginsSetup);
    await flushPromises();

    expect(registerStreamsAgentBuilder).not.toHaveBeenCalled();
  });

  it('does not register agent builder when agentBuilder plugin is absent', async () => {
    delete pluginsSetup.agentBuilder;
    plugin.setup(coreSetup, pluginsSetup);
    await flushPromises();

    expect(registerStreamsAgentBuilder).not.toHaveBeenCalled();
  });
});
