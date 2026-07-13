/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { dashboardManagementSkill } from './dashboard_management_skill';
import { registerSkills } from './register_skills';

describe('registerSkills', () => {
  it('registers the dashboard management skill', async () => {
    const register = jest.fn();
    const agentBuilder = {
      skills: { register },
    } as unknown as AgentBuilderPluginSetup;

    await registerSkills(agentBuilder);

    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith(dashboardManagementSkill);
  });

  it('includes SML discovery instructions in the skill content', () => {
    expect(dashboardManagementSkill.content).toContain('platform.core.sml_search');
    expect(dashboardManagementSkill.content).toContain('platform.core.sml_attach');
  });

  it('teaches the NL-intent contract, not operations or design guidance', () => {
    expect(dashboardManagementSkill.content).toContain('dashboardAttachmentId');
    expect(dashboardManagementSkill.content).toContain('additionalContext');
    expect(dashboardManagementSkill.content).toContain('additionalInstructions');
    // Design knowledge lives in the inner agent's prompt now.
    expect(dashboardManagementSkill.content).not.toContain('Dashboard Composition Guidelines');
    expect(dashboardManagementSkill.content).not.toContain('Grid Packing Rules');
    // No stale operations-contract vocabulary (the `operations` input field,
    // stale snake_case params, or per-operation instructions).
    expect(dashboardManagementSkill.content).not.toContain('`operations`');
    expect(dashboardManagementSkill.content).not.toContain('dashboard_attachment_id');
    expect(dashboardManagementSkill.content).not.toContain('set_metadata');
    expect(dashboardManagementSkill.content).not.toContain('source: "config"');
  });
});
