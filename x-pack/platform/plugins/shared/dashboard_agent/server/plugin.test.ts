/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { DashboardAgentPlugin } from './plugin';
import { dashboardManagementSkill } from './skills/dashboard_management_skill';

describe('DashboardAgentPlugin', () => {
  it('registers the dashboard attachment type, skill, and SML type', () => {
    const registerAttachmentType = jest.fn();
    const registerSkill = jest.fn();
    const registerSmlType = jest.fn();

    const plugin = new DashboardAgentPlugin(coreMock.createPluginInitializerContext());

    plugin.setup(
      {} as never,
      {
        agentBuilder: {
          attachments: { registerType: registerAttachmentType },
          skills: { register: registerSkill },
        },
        agentContextLayer: {
          registerType: registerSmlType,
        },
      } as never
    );

    expect(registerAttachmentType).toHaveBeenCalledTimes(1);
    expect(registerSkill).toHaveBeenCalledWith(dashboardManagementSkill);
    expect(registerSmlType).toHaveBeenCalledTimes(1);
    expect(registerSmlType).toHaveBeenCalledWith(expect.objectContaining({ id: 'dashboard' }));
  });
});
