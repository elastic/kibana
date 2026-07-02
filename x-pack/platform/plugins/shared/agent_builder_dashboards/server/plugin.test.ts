/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { AgentBuilderDashboardsPlugin } from './plugin';
import { dashboardManagementSkill } from './skills/dashboard_management_skill';

describe('AgentBuilderDashboardsPlugin', () => {
  it('registers the dashboard attachment type, skill, and CE type', () => {
    const registerAttachmentType = jest.fn();
    const registerSkill = jest.fn();
    const registerCeType = jest.fn();

    const plugin = new AgentBuilderDashboardsPlugin(coreMock.createPluginInitializerContext());

    plugin.setup(
      {} as never,
      {
        agentBuilder: {
          attachments: { registerType: registerAttachmentType },
          skills: { register: registerSkill },
        },
        contextEngine: {
          registerType: registerCeType,
        },
      } as never
    );

    expect(registerAttachmentType).toHaveBeenCalledTimes(1);
    expect(registerSkill).toHaveBeenCalledWith(dashboardManagementSkill);
    expect(registerCeType).toHaveBeenCalledTimes(1);
    expect(registerCeType).toHaveBeenCalledWith(expect.objectContaining({ id: 'dashboard' }));
  });
});
