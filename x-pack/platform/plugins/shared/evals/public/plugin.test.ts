/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import type { PluginInitializerContext } from '@kbn/core/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { EvalsSetupDependencies } from './types';
import { EvalsPublicPlugin } from './plugin';

describe('EvalsPublicPlugin', () => {
  const createPlugin = (enabled: boolean) =>
    new EvalsPublicPlugin({
      config: { get: () => ({ enabled }) },
    } as unknown as PluginInitializerContext);

  const createManagementMock = () => {
    const registerApp = vi.fn();
    return {
      sections: {
        section: {
          ai: {
            registerApp,
          },
        },
      },
    } as unknown as ManagementSetup & {
      sections: { section: { ai: { registerApp: Mock } } };
    };
  };

  const createWorkflowsExtensionsMock = () =>
    ({
      registerStepDefinition: vi.fn(),
    } as unknown as EvalsSetupDependencies['workflowsExtensions'] & {
      registerStepDefinition: Mock;
    });

  const createCoreSetupMock = () =>
    ({
      application: {
        register: vi.fn(),
      },
      getStartServices: vi.fn(),
    } as any);

  it('registers the standalone app and the Stack Management AI entry when management is available', () => {
    const plugin = createPlugin(true);
    const management = createManagementMock();

    const coreSetup = createCoreSetupMock();

    plugin.setup(coreSetup, { management });

    expect(coreSetup.application.register).toHaveBeenCalledTimes(1);
    expect(coreSetup.application.register).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'evals',
        appRoute: '/app/evals',
        euiIconType: 'flask',
      })
    );
    expect(management.sections.section.ai.registerApp).toHaveBeenCalledTimes(1);
    expect(management.sections.section.ai.registerApp).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'evals',
        order: 2,
        capabilitiesId: 'evals',
      })
    );
  });

  it('registers the standalone app even when management is not available', () => {
    const plugin = createPlugin(true);

    const coreSetup = createCoreSetupMock();

    plugin.setup(coreSetup, {});

    expect(coreSetup.application.register).toHaveBeenCalledTimes(1);
    expect(coreSetup.application.register).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'evals',
        appRoute: '/app/evals',
        euiIconType: 'flask',
      })
    );
  });

  it('registers the ai.evals.* Workflows editor steps when the feature flag is enabled', () => {
    const plugin = createPlugin(true);
    const workflowsExtensions = createWorkflowsExtensionsMock();

    plugin.setup(createCoreSetupMock(), { workflowsExtensions });

    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalled();
  });

  it('does not register the ai.evals.* Workflows editor steps when the feature flag is disabled', () => {
    const plugin = createPlugin(false);
    const workflowsExtensions = createWorkflowsExtensionsMock();

    plugin.setup(createCoreSetupMock(), { workflowsExtensions });

    expect(workflowsExtensions.registerStepDefinition).not.toHaveBeenCalled();
  });
});
