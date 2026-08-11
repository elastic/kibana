/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { AgentBuilderDashboardsPlugin } from './plugin';

describe('AgentBuilderDashboardsPlugin', () => {
  it('registers the dashboard attachment type, skill, and SML type', async () => {
    const registerAttachmentType = jest.fn();
    const registerSkill = jest.fn();
    const registerSmlType = jest.fn();
    const getBooleanValue = jest.fn().mockResolvedValue(true);

    const plugin = new AgentBuilderDashboardsPlugin(coreMock.createPluginInitializerContext());
    const coreSetup = coreMock.createSetup();
    coreSetup.getStartServices.mockResolvedValue([
      {
        featureFlags: { getBooleanValue },
      },
      {},
      {},
    ] as never);

    plugin.setup(coreSetup as never, {
      agentBuilder: {
        attachments: { registerType: registerAttachmentType },
        skills: { register: registerSkill },
      },
      agentBuilderSml: {
        registerType: registerSmlType,
      },
    } as never);

    await new Promise((resolve) => setImmediate(resolve));

    expect(registerAttachmentType).toHaveBeenCalledTimes(1);
    expect(getBooleanValue).toHaveBeenCalled();
    expect(registerSkill).toHaveBeenCalledTimes(1);
    expect(registerSkill).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'dashboard-management' })
    );
    expect(registerSmlType).toHaveBeenCalledTimes(1);
    expect(registerSmlType).toHaveBeenCalledWith(expect.objectContaining({ id: 'dashboard' }));
  });
});
