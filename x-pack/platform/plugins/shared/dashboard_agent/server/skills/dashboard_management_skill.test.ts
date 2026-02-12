/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { validateSkillDefinition } from '@kbn/agent-builder-server/skills';
import { dashboardManagementSkill } from './dashboard_management_skill';

describe('dashboardManagementSkill', () => {
  it('is a valid skill definition', async () => {
    await expect(validateSkillDefinition(dashboardManagementSkill)).resolves.toEqual(
      dashboardManagementSkill
    );
  });

  it('uses dashboard skill base path and expected metadata', () => {
    expect(dashboardManagementSkill.id).toBe('dashboard-management');
    expect(dashboardManagementSkill.name).toBe('dashboard-management');
    expect(dashboardManagementSkill.basePath).toBe('skills/platform/dashboard');
    expect(dashboardManagementSkill.description).toContain('Create or update Kibana dashboards');
  });

  it('exposes the expected bounded tool set', () => {
    expect(dashboardManagementSkill.getAllowedTools?.()).toEqual([
      'platform.dashboard.manage_dashboard',
      platformCoreTools.createVisualization,
      platformCoreTools.listIndices,
      platformCoreTools.getIndexMapping,
      platformCoreTools.generateEsql,
      platformCoreTools.executeEsql,
    ]);
  });

  it('contains best-practice structured content sections', () => {
    expect(dashboardManagementSkill.content).toContain('## When to Use This Skill');
    expect(dashboardManagementSkill.content).toContain('## Core Instructions');
    expect(dashboardManagementSkill.content).toContain('## Examples');
    expect(dashboardManagementSkill.content).toContain('## Edge Cases and Limitations');
  });

  it('includes referenced supplementary content', () => {
    expect(dashboardManagementSkill.referencedContent).toEqual([
      expect.objectContaining({
        relativePath: './examples',
        name: 'manage-dashboard-payloads',
      }),
      expect.objectContaining({
        relativePath: './examples',
        name: 'tool-result-format',
      }),
    ]);
  });
});
