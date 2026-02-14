/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';
import { NO_DEFAULT_CONNECTOR, FALLBACK_DEFAULT_CONNECTOR_ID } from '../common/constants';
import { GenAiSettingsPlugin } from './plugin';

describe('GenAiSettingsPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createPlugin = () => {
    const initializerContext = {
      logger: {
        get: jest.fn().mockReturnValue({
          error: jest.fn(),
          debug: jest.fn(),
          warn: jest.fn(),
        }),
      },
    } as unknown as PluginInitializerContext;
    return new GenAiSettingsPlugin(initializerContext);
  };

  const setupPlugin = (options: { connectors?: Array<{ id: string }> } = {}) => {
    const plugin = createPlugin();
    const coreSetup = coreMock.createSetup();

    const mockActionsClient = {
      getAll: jest.fn().mockResolvedValue(options.connectors ?? []),
    };

    const mockActions = {
      getActionsClientWithRequest: jest.fn().mockResolvedValue(mockActionsClient),
    };

    coreSetup.getStartServices.mockResolvedValue([
      {} as any,
      { actions: mockActions, inference: {} } as any,
      {} as any,
    ]);

    const setupDeps = {
      actions: {} as any,
      inference: {} as any,
    };

    plugin.setup(coreSetup, setupDeps);

    return { coreSetup, mockActionsClient, mockActions };
  };

  const getDefaultConnectorGetValue = (coreSetup: ReturnType<typeof coreMock.createSetup>) => {
    const registeredSettings = coreSetup.uiSettings.register.mock.calls.find(
      (call) => call[0][GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]
    );
    return registeredSettings![0][GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR].getValue;
  };

  describe('default AI connector getValue()', () => {
    it('returns FALLBACK_DEFAULT_CONNECTOR_ID when the preferred connector exists', async () => {
      const { coreSetup } = setupPlugin({
        connectors: [
          { id: 'some-other-connector' },
          { id: FALLBACK_DEFAULT_CONNECTOR_ID },
          { id: 'another-connector' },
        ],
      });
      const getValue = getDefaultConnectorGetValue(coreSetup);

      const requestMock = { auth: { isAuthenticated: true } };
      await expect(getValue!({ request: requestMock as any })).resolves.toBe(
        FALLBACK_DEFAULT_CONNECTOR_ID
      );
    });

    it('returns NO_DEFAULT_CONNECTOR when the preferred connector does not exist', async () => {
      const { coreSetup } = setupPlugin({
        connectors: [{ id: 'some-other-connector' }, { id: 'another-connector' }],
      });
      const getValue = getDefaultConnectorGetValue(coreSetup);

      const requestMock = { auth: { isAuthenticated: true } };
      await expect(getValue!({ request: requestMock as any })).resolves.toBe(NO_DEFAULT_CONNECTOR);
    });

    it('returns NO_DEFAULT_CONNECTOR when no connectors are available', async () => {
      const { coreSetup } = setupPlugin({ connectors: [] });
      const getValue = getDefaultConnectorGetValue(coreSetup);

      const requestMock = { auth: { isAuthenticated: true } };
      await expect(getValue!({ request: requestMock as any })).resolves.toBe(NO_DEFAULT_CONNECTOR);
    });

    it('returns NO_DEFAULT_CONNECTOR when request is not provided', async () => {
      const { coreSetup } = setupPlugin({
        connectors: [{ id: FALLBACK_DEFAULT_CONNECTOR_ID }],
      });
      const getValue = getDefaultConnectorGetValue(coreSetup);

      await expect(getValue!()).resolves.toBe(NO_DEFAULT_CONNECTOR);
    });

    it('returns NO_DEFAULT_CONNECTOR when an error occurs', async () => {
      const { coreSetup, mockActions } = setupPlugin();
      mockActions.getActionsClientWithRequest.mockRejectedValue(
        new Error('Actions client unavailable')
      );
      const getValue = getDefaultConnectorGetValue(coreSetup);

      const requestMock = { auth: { isAuthenticated: true } };
      await expect(getValue!({ request: requestMock as any })).resolves.toBe(NO_DEFAULT_CONNECTOR);
    });

    it('has NO_DEFAULT_CONNECTOR as the static fallback value', () => {
      const { coreSetup } = setupPlugin();
      const registeredSettings = coreSetup.uiSettings.register.mock.calls.find(
        (call) => call[0][GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]
      );
      const setting = registeredSettings![0][GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR];
      expect(setting.value).toBe(NO_DEFAULT_CONNECTOR);
    });
  });
});
