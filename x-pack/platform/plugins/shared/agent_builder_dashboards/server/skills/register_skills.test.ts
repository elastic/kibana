/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { dashboardManagementSkill } from './dashboard_management_skill';
import { vegaVisualizationSkill } from './vega_visualization_skill';
import { registerSkills } from './register_skills';

describe('registerSkills', () => {
  it('registers the dashboard management and vega visualization skills', async () => {
    const register = jest.fn();
    const agentBuilder = {
      skills: { register },
    } as unknown as AgentBuilderPluginSetup;

    await registerSkills(agentBuilder);

    expect(register).toHaveBeenCalledTimes(2);
    expect(register).toHaveBeenCalledWith(dashboardManagementSkill);
    expect(register).toHaveBeenCalledWith(vegaVisualizationSkill);
  });

  it('includes SML discovery instructions in the dashboard management skill content', () => {
    expect(dashboardManagementSkill.content).toContain('platform.core.sml_search');
    expect(dashboardManagementSkill.content).toContain('platform.core.sml_attach');
  });

  it('exposes the create_vega_visualization tool on the vega visualization skill', async () => {
    const inlineTools = await vegaVisualizationSkill.getInlineTools?.();
    expect(inlineTools?.[0].id).toBe('platform.dashboard.create_vega_visualization');
  });

  it('exposes generate_esql and execute_esql on the vega visualization skill', async () => {
    const registryTools = await vegaVisualizationSkill.getRegistryTools?.();
    expect(registryTools).toEqual(
      expect.arrayContaining(['platform.core.generate_esql', 'platform.core.execute_esql'])
    );
  });

  it('flags the vega visualization skill as experimental', () => {
    expect(vegaVisualizationSkill.experimental).toBe(true);
  });
});
