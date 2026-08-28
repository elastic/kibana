/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools, platformCoreCasesTools } from '@kbn/agent-builder-common';
import { validateSkillDefinition } from '@kbn/agent-builder-server/skills/type_definition';
import { isAllowedBuiltinSkill } from '@kbn/agent-builder-server/allow_lists';
import { buildCasesSkill } from './cases_skill';

describe('buildCasesSkill', () => {
  describe('with templates disabled', () => {
    const skill = buildCasesSkill(false);

    it('has the expected identity and base path', () => {
      expect(skill.id).toBe('cases-management');
      expect(skill.name).toBe('cases-management');
      expect(skill.basePath).toBe('skills/platform/cases');
    });

    it('is registered in the agent-builder built-in skills allowlist', () => {
      expect(isAllowedBuiltinSkill(skill.id)).toBe(true);
    });

    it('passes the agent-builder skill-definition schema', async () => {
      await expect(validateSkillDefinition(skill)).resolves.toBeDefined();
    });

    it('exposes the expected registry tools', () => {
      const tools = skill.getRegistryTools?.() ?? [];
      expect(tools).toEqual([
        platformCoreTools.cases,
        platformCoreCasesTools.manage,
        platformCoreCasesTools.getAttachments,
        platformCoreCasesTools.manageAttachments,
        platformCoreCasesTools.observables,
      ]);
    });

    it('does not mention set_extended_fields in the skill content', () => {
      expect(skill.content).not.toContain('set_extended_fields');
    });

    it('does not include the extended fields section', () => {
      expect(skill.content).not.toContain('Extended fields');
    });

    it('does not mention find_templates in the skill content', () => {
      expect(skill.content).not.toContain(platformCoreCasesTools.findTemplates);
    });

    it('does not include the find-a-template-by-name section', () => {
      expect(skill.content).not.toContain('Finding a template by name');
    });
  });

  describe('with templates enabled', () => {
    const skill = buildCasesSkill(true);

    it('has the expected identity and base path', () => {
      expect(skill.id).toBe('cases-management');
      expect(skill.name).toBe('cases-management');
      expect(skill.basePath).toBe('skills/platform/cases');
    });

    it('passes the agent-builder skill-definition schema', async () => {
      await expect(validateSkillDefinition(skill)).resolves.toBeDefined();
    });

    it('mentions set_extended_fields in the manage tool row', () => {
      expect(skill.content).toContain('set_extended_fields');
    });

    it('includes the extended fields documentation section', () => {
      expect(skill.content).toContain('Extended fields');
      expect(skill.content).toContain('<name>_as_<type>');
      expect(skill.content).toContain('/api/cases/{case_id}/fields');
    });

    it('does not include inline tools', () => {
      expect(skill.getInlineTools).toBeUndefined();
    });

    it('mentions find_templates in the manage tool table and registry tools', () => {
      expect(skill.content).toContain(platformCoreCasesTools.findTemplates);
      const tools = skill.getRegistryTools?.() ?? [];
      expect(tools).toContain(platformCoreCasesTools.findTemplates);
    });

    it('includes the find-a-template-by-name section', () => {
      expect(skill.content).toContain('Finding a template by name');
      expect(skill.content).toContain('create_from_template');
    });
  });
});
