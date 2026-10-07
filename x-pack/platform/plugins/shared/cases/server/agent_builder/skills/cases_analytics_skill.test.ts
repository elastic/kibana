/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { validateSkillDefinition } from '@kbn/agent-builder-server/skills/type_definition';
import { isAllowedBuiltinSkill } from '@kbn/agent-builder-server/allow_lists';
import { casesAnalyticsSkill } from './cases_analytics_skill';

describe('casesAnalyticsSkill', () => {
  it('has the expected identity and base path', () => {
    expect(casesAnalyticsSkill.id).toBe('cases-analytics');
    expect(casesAnalyticsSkill.name).toBe('cases-analytics');
    // Grouped with the other Cases skill rather than a bespoke directory.
    expect(casesAnalyticsSkill.basePath).toBe('skills/platform/cases');
  });

  it('is registered in the agent-builder built-in skills allowlist', () => {
    expect(isAllowedBuiltinSkill(casesAnalyticsSkill.id)).toBe(true);
  });

  it('passes the agent-builder skill-definition schema (name, description, referenced content)', async () => {
    await expect(validateSkillDefinition(casesAnalyticsSkill)).resolves.toBeDefined();
  });

  it('exposes the ES|QL + visualization tools plus the cases read tool for verification', () => {
    const tools = casesAnalyticsSkill.getRegistryTools?.() ?? [];
    expect(tools).toEqual(
      expect.arrayContaining([
        platformCoreTools.generateEsql,
        platformCoreTools.executeEsql,
        platformCoreTools.search,
        platformCoreTools.listIndices,
        platformCoreTools.getIndexMapping,
        platformCoreTools.createVisualization,
        platformCoreTools.cases,
      ])
    );
  });

  it('does not register inline tools (it composes existing built-ins)', () => {
    expect(casesAnalyticsSkill.getInlineTools).toBeUndefined();
  });

  it('documents case.template.id and case.template.version in the index field table', () => {
    expect(casesAnalyticsSkill.content).toContain('case.template.id');
    expect(casesAnalyticsSkill.content).toContain('case.template.version');
  });

  it('includes a template analytics section', () => {
    expect(casesAnalyticsSkill.content).toContain('Template analytics');
    expect(casesAnalyticsSkill.content).toContain('templated');
  });

  it('includes template-analytics in the referenced content', () => {
    const names = casesAnalyticsSkill.referencedContent?.map((r) => r.name) ?? [];
    expect(names).toContain('template-analytics');
  });
});
