/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { consumeRunQuota, createRunQuotaInternalRepository } from './lib/run_quotas';
import { knowledgeIndicatorsDataStream } from './lib/knowledge_indicators';
import { detectionsDataStream } from './lib/significant_events/detections';
import { eventsDataStream } from './lib/significant_events/events';
import type { SignificantEventsPluginSetupDependencies } from './types';
import { SignificantEventsPlugin } from './plugin';

jest.mock('./lib/run_quotas', () => ({
  consumeRunQuota: jest.fn(),
  createRunQuotaInternalRepository: jest.fn(),
}));

jest.mock('./routes', () => ({ significantEventsRouteRepository: {} }));

const consumeRunQuotaMock = jest.mocked(consumeRunQuota);
const createRunQuotaInternalRepositoryMock = jest.mocked(createRunQuotaInternalRepository);

const createPlugin = () => new SignificantEventsPlugin(coreMock.createPluginInitializerContext());

const createCoreSetup = () => {
  const core = coreMock.createSetup();
  core.pricing.isFeatureAvailable.mockResolvedValue(false);
  return core;
};

const createSetupDeps = ({
  registerInvestigationQuota,
}: {
  registerInvestigationQuota?: jest.Mock;
} = {}) =>
  ({
    streams: {
      registerKnowledgeIndicatorClientProvider: jest.fn(),
    },
    ...(registerInvestigationQuota
      ? { nightshiftInvestigations: { registerInvestigationQuota } }
      : {}),
  }) as unknown as SignificantEventsPluginSetupDependencies;

describe('SignificantEventsPlugin setup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    consumeRunQuotaMock.mockResolvedValue({ allowed: true });
  });

  it('supports the investigations plugin being absent', () => {
    const plugin = createPlugin();

    expect(() => plugin.setup(createCoreSetup(), createSetupDeps())).not.toThrow();
  });

  it('registers all Core data streams', () => {
    const core = createCoreSetup();

    createPlugin().setup(core, createSetupDeps());

    expect(
      core.dataStreams.registerDataStream.mock.calls.map(([definition]) => definition)
    ).toEqual([detectionsDataStream, eventsDataStream, knowledgeIndicatorsDataStream]);
  });

  it('registers a callback without accessing start services', () => {
    const registerInvestigationQuota = jest.fn();
    const plugin = createPlugin();

    plugin.setup(createCoreSetup(), createSetupDeps({ registerInvestigationQuota }));

    expect(registerInvestigationQuota).toHaveBeenCalledWith(expect.any(Function));
    expect(createRunQuotaInternalRepositoryMock).not.toHaveBeenCalled();
  });

  it('reports unavailable start services when the callback is invoked too early', async () => {
    const registerInvestigationQuota = jest.fn();
    const plugin = createPlugin();
    plugin.setup(createCoreSetup(), createSetupDeps({ registerInvestigationQuota }));
    const [callback] = registerInvestigationQuota.mock.calls[0];

    await expect(callback()).rejects.toThrow('Significant Events start services are unavailable');
    expect(createRunQuotaInternalRepositoryMock).not.toHaveBeenCalled();
  });

  it('consumes the investigation quota with the existing internal repository when invoked', async () => {
    const registerInvestigationQuota = jest.fn();
    const internalRepository = {} as ReturnType<typeof createRunQuotaInternalRepository>;
    createRunQuotaInternalRepositoryMock.mockReturnValue(internalRepository);
    const plugin = createPlugin();
    plugin.setup(createCoreSetup(), createSetupDeps({ registerInvestigationQuota }));
    const server = plugin.server;
    if (!server) {
      throw new Error('Expected Significant Events server');
    }
    server.core = coreMock.createStart();
    const [callback] = registerInvestigationQuota.mock.calls[0];

    await expect(callback()).resolves.toEqual({ allowed: true });

    expect(createRunQuotaInternalRepositoryMock).toHaveBeenCalledWith(server);
    expect(consumeRunQuotaMock).toHaveBeenCalledWith({
      internalRepository,
      group: 'investigation',
    });
  });
});
