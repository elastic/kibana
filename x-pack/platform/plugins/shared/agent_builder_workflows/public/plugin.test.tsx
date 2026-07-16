/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { registerWorkflowAttachmentRenderers } from './attachment_types';
import { AgentBuilderWorkflowsPlugin } from './plugin';
import type { PluginSetupDependencies, PluginStartDependencies } from './types';

jest.mock('./attachment_types', () => ({
  registerWorkflowAttachmentRenderers: jest.fn(),
}));

const registerWorkflowAttachmentRenderersMock =
  registerWorkflowAttachmentRenderers as jest.MockedFunction<
    typeof registerWorkflowAttachmentRenderers
  >;

const flushPromises = () => new Promise(process.nextTick);

describe('AgentBuilderWorkflowsPlugin', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const setupPlugin = () => {
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();

    const attachments = { addAttachmentType: jest.fn() };
    const telemetry = { reportWorkflowCreated: jest.fn() };
    const queryClient = { getQueryData: jest.fn() };

    const depsStart = {
      agentBuilder: { attachments },
      workflowsManagement: {
        getTelemetry: jest.fn().mockResolvedValue(telemetry),
        getQueryClient: jest.fn().mockResolvedValue(queryClient),
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
