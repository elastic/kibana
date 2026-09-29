/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import { coreMock } from '@kbn/core/public/mocks';
import { registerWorkflowAttachmentRenderers } from './attachment_types';
import { AgentBuilderWorkflowsPlugin } from './plugin';
import type { PluginSetupDependencies, PluginStartDependencies } from './types';

vi.mock('./attachment_types', () => {
      const mocked = {
      registerWorkflowAttachmentRenderers: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const registerWorkflowAttachmentRenderersMock =
  registerWorkflowAttachmentRenderers as MockedFunction<
    typeof registerWorkflowAttachmentRenderers
  >;

const flushPromises = () => new Promise(process.nextTick);

describe('AgentBuilderWorkflowsPlugin', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const setupPlugin = () => {
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();

    const attachments = { addAttachmentType: vi.fn() };
    const telemetry = { reportWorkflowCreated: vi.fn() };
    const queryClient = { getQueryData: vi.fn() };

    const depsStart = {
      agentBuilder: { attachments },
      workflowsManagement: {
        getTelemetry: vi.fn().mockResolvedValue(telemetry),
        getQueryClient: vi.fn().mockResolvedValue(queryClient),
      },
    } as unknown as PluginStartDependencies;

    coreSetup.getStartServices.mockResolvedValue([coreStart, depsStart, {}]);

    const plugin = new AgentBuilderWorkflowsPlugin();
    plugin.setup(coreSetup, {} as PluginSetupDependencies);

    return { coreSetup, coreStart, attachments, telemetry, queryClient };
  };

  it('registers workflow attachment renderers on setup', async () => {
    const { coreStart, attachments, telemetry, queryClient } = setupPlugin();

    await flushPromises();

    expect(registerWorkflowAttachmentRenderersMock).toHaveBeenCalledTimes(1);
    expect(registerWorkflowAttachmentRenderersMock).toHaveBeenCalledWith(attachments, {
      core: coreStart,
      telemetry,
      queryClient,
    });
  });

  it('does not gate renderer registration behind any ui setting', async () => {
    // Regression guard: registration used to wait for the
    // `agentBuilder:experimentalFeatures` advanced setting to become true,
    // leaving workflow attachments unrendered on default deployments.
    const { coreSetup } = setupPlugin();

    await flushPromises();

    expect(coreSetup.uiSettings.get$).not.toHaveBeenCalled();
    expect(registerWorkflowAttachmentRenderersMock).toHaveBeenCalledTimes(1);
  });
});
