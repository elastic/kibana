/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSkillsInstructions } from './prompts';
import type { IFileStore } from '@kbn/agent-builder-server/runner';
import { FileEntryType } from '@kbn/agent-builder-server/runner/filestore';
import type { FileEntry } from '@kbn/agent-builder-server/runner/filestore';
import type { SkillFileEntry } from '../runner/store/volumes/skills/types';

describe('getSkillsInstructions', () => {
  const createMockFileStore = (): jest.Mocked<IFileStore> => ({
    read: jest.fn(),
    ls: jest.fn(),
    glob: jest.fn(),
    grep: jest.fn(),
  });

  const createSkillFileEntry = (
    path: string,
    skillName: string,
    skillDescription: string
  ): SkillFileEntry => ({
    type: 'file',
    path,
    content: {
      raw: {},
      plain_text: `---\nname: ${skillName}\ndescription: ${skillDescription}\n---\n\nBody content`,
    },
    metadata: {
      type: FileEntryType.skill,
      id: skillName,
      token_count: 10,
      readonly: true,
      skill_name: skillName,
      skill_description: skillDescription,
      skill_id: skillName,
    },
  });

  const createNonSkillFileEntry = (path: string): FileEntry => ({
    type: 'file',
    path,
    content: {
      raw: {},
    },
    metadata: {
      type: FileEntryType.toolResult,
      id: path,
      token_count: 10,
      readonly: false,
    },
  });

  describe('when no skills are available', () => {
    it('returns message indicating no skills are available', async () => {
      const filesystem = createMockFileStore();
      filesystem.glob.mockResolvedValue([]);

      const result = await getSkillsInstructions({ filesystem });

      expect(result).toContain('## SKILLS');
      expect(result).toContain('No skills are currently available');
      expect(result).toContain('Load a skill to get detailed instructions');
    });

    it('returns formatted message when glob returns empty array', async () => {
      const filesystem = createMockFileStore();
      filesystem.glob.mockResolvedValue([]);

      const result = await getSkillsInstructions({ filesystem });

      const lines = result.split('\n');
      expect(lines[0]).toBe('## SKILLS');
      expect(lines[1]).toBe(
        'Load a skill to get detailed instructions for a specific task. No skills are currently available.'
      );
    });
  });

  describe('when skills are available', () => {
    it('returns formatted skills list', async () => {
      const filesystem = createMockFileStore();
      const skill1 = createSkillFileEntry(
        'skills/platform/core/test-skill/SKILL.md',
        'test-skill',
        'A test skill'
      );
      const skill2 = createSkillFileEntry(
        'skills/security/alerts/alert-skill/SKILL.md',
        'alert-skill',
        'An alert skill'
      );
      filesystem.glob.mockResolvedValue([skill1, skill2]);

      const result = await getSkillsInstructions({ filesystem });

      expect(result).toContain('## SKILLS');
      expect(result).toContain(
        'Load a skill using filestore tools to get detailed instructions for a specific task'
      );
      expect(result).toContain(
        'Skills provide specialized knowledge and best practices for specific tasks'
      );
      expect(result).toContain('<available_skills>');
      expect(result).toContain('</available_skills>');
    });

    it('includes skill entries in XML format', async () => {
      const filesystem = createMockFileStore();
      const skill = createSkillFileEntry(
        'skills/platform/core/test-skill/SKILL.md',
        'test-skill',
        'A test skill description'
      );
      filesystem.glob.mockResolvedValue([skill]);

      const result = await getSkillsInstructions({ filesystem });

      expect(result).toContain('<skill path="skills/platform/core/test-skill/SKILL.md">');
      expect(result).toContain('<name>test-skill</name>');
      expect(result).toContain('<description>A test skill description</description>');
      expect(result).toContain('</skill>');
    });

    it('sorts skills by path', async () => {
      const filesystem = createMockFileStore();
      const skill1 = createSkillFileEntry(
        'skills/platform/core/z-skill/SKILL.md',
        'z-skill',
        'Z skill'
      );
      const skill2 = createSkillFileEntry(
        'skills/platform/core/a-skill/SKILL.md',
        'a-skill',
        'A skill'
      );
      const skill3 = createSkillFileEntry(
        'skills/platform/core/m-skill/SKILL.md',
        'm-skill',
        'M skill'
      );
      filesystem.glob.mockResolvedValue([skill1, skill2, skill3]);

      const result = await getSkillsInstructions({ filesystem });

      const aIndex = result.indexOf('a-skill');
      const mIndex = result.indexOf('m-skill');
      const zIndex = result.indexOf('z-skill');

      expect(aIndex).toBeLessThan(mIndex);
      expect(mIndex).toBeLessThan(zIndex);
    });

    it('filters out non-skill file entries', async () => {
      const filesystem = createMockFileStore();
      const skill = createSkillFileEntry(
        'skills/platform/core/test-skill/SKILL.md',
        'test-skill',
        'A test skill'
      );
      const nonSkill = createNonSkillFileEntry('some/other/file.md');
      filesystem.glob.mockResolvedValue([skill, nonSkill]);

      const result = await getSkillsInstructions({ filesystem });

      expect(result).toContain('test-skill');
      expect(result).not.toContain('some/other/file.md');
    });

    it('handles multiple skills with different paths', async () => {
      const filesystem = createMockFileStore();
      const skill1 = createSkillFileEntry(
        'skills/platform/core/core-skill/SKILL.md',
        'core-skill',
        'Core skill'
      );
      const skill2 = createSkillFileEntry(
        'skills/security/alerts/alert-skill/SKILL.md',
        'alert-skill',
        'Alert skill'
      );
      const skill3 = createSkillFileEntry(
        'skills/observability/monitoring/monitor-skill/SKILL.md',
        'monitor-skill',
        'Monitor skill'
      );
      filesystem.glob.mockResolvedValue([skill1, skill2, skill3]);

      const result = await getSkillsInstructions({ filesystem });

      expect(result).toContain('core-skill');
      expect(result).toContain('alert-skill');
      expect(result).toContain('monitor-skill');
    });

    it('includes all skill metadata in XML format', async () => {
      const filesystem = createMockFileStore();
      const skill = createSkillFileEntry(
        'skills/platform/core/complex-skill/SKILL.md',
        'complex-skill',
        'A complex skill with a longer description that explains what it does'
      );
      filesystem.glob.mockResolvedValue([skill]);

      const result = await getSkillsInstructions({ filesystem });

      const skillBlock = result.match(/<skill[^>]*>[\s\S]*?<\/skill>/)?.[0];
      expect(skillBlock).toBeDefined();
      expect(skillBlock).toContain('path="skills/platform/core/complex-skill/SKILL.md"');
      expect(skillBlock).toContain('<name>complex-skill</name>');
      expect(skillBlock).toContain(
        '<description>A complex skill with a longer description that explains what it does</description>'
      );
    });
  });

  describe('edge cases', () => {
    it('handles empty skill description', async () => {
      const filesystem = createMockFileStore();
      const skill = createSkillFileEntry(
        'skills/platform/core/empty-desc/SKILL.md',
        'empty-desc',
        ''
      );
      filesystem.glob.mockResolvedValue([skill]);

      const result = await getSkillsInstructions({ filesystem });

      expect(result).toContain('<description></description>');
    });

    it('handles skills with special characters in description', async () => {
      const filesystem = createMockFileStore();
      const skill = createSkillFileEntry(
        'skills/platform/core/special/SKILL.md',
        'special',
        'Description with "quotes" and <tags> and &ampersands'
      );
      filesystem.glob.mockResolvedValue([skill]);

      const result = await getSkillsInstructions({ filesystem });

      expect(result).toContain(
        'Description with &quot;quotes&quot; and &lt;tags&gt; and &amp;ampersands'
      );
    });

    it('handles very long skill descriptions', async () => {
      const filesystem = createMockFileStore();
      const longDescription = 'a'.repeat(500);
      const skill = createSkillFileEntry(
        'skills/platform/core/long/SKILL.md',
        'long',
        longDescription
      );
      filesystem.glob.mockResolvedValue([skill]);

      const result = await getSkillsInstructions({ filesystem });

      expect(result).toContain(longDescription);
    });

    it('calls glob with correct pattern', async () => {
      const filesystem = createMockFileStore();
      filesystem.glob.mockResolvedValue([]);

      await getSkillsInstructions({ filesystem });

      expect(filesystem.glob).toHaveBeenCalledWith('/**/SKILL.md');
    });

    it('handles glob errors gracefully', async () => {
      const filesystem = createMockFileStore();
      filesystem.glob.mockRejectedValue(new Error('Glob error'));

      await expect(getSkillsInstructions({ filesystem })).rejects.toThrow('Glob error');
    });
  });
});
