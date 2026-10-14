/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import type { RelevantSkill } from '@kbn/agent-builder-common';
import { isHumanMessage } from '@langchain/core/messages';
import {
  getSkillsInstructions,
  getRelevantSkillsPointerInstructions,
  formatRelevantSkillsNotice,
  createRelevantSkillsNoticeMessage,
  RELEVANT_SKILLS_MESSAGE_NAME,
} from './skills';

const skill = (overrides: Partial<InternalSkillDefinition>): InternalSkillDefinition =>
  ({
    id: 'platform.core.test-skill',
    name: 'test-skill',
    description: 'A test skill',
    basePath: 'skills/platform/core',
    referencedContent: [],
    ...overrides,
  } as unknown as InternalSkillDefinition);

describe('getSkillsInstructions', () => {
  describe('when no skills are available', () => {
    it('returns the no-skills marker', () => {
      const result = getSkillsInstructions({ skills: [] });
      expect(result).toContain('## SKILLS');
      expect(result).toContain('No skills are currently available');
      expect(result).toContain('Load a skill to get detailed instructions');
    });
  });

  describe('when skills are available', () => {
    it('renders one line per skill in markdown list format', () => {
      const result = getSkillsInstructions({
        skills: [
          skill({
            id: 'platform.core.alpha',
            name: 'alpha',
            description: 'Alpha skill',
          }),
        ],
      });
      expect(result).toContain('## SKILLS');
      expect(result).toMatch(/- alpha \(.+SKILL\.md\): Alpha skill/);
    });

    it('sorts skills by name', () => {
      const result = getSkillsInstructions({
        skills: [
          skill({ id: 'a.z', name: 'z-skill' }),
          skill({ id: 'a.a', name: 'a-skill' }),
          skill({ id: 'a.m', name: 'm-skill' }),
        ],
      });
      const aIdx = result.indexOf('a-skill');
      const mIdx = result.indexOf('m-skill');
      const zIdx = result.indexOf('z-skill');
      expect(aIdx).toBeLessThan(mIdx);
      expect(mIdx).toBeLessThan(zIdx);
    });

    it('includes guidance for loading skills', () => {
      const result = getSkillsInstructions({
        skills: [skill({})],
      });
      expect(result).toContain(
        'Always check the skill list above before acting on a user request.'
      );
    });

    it('renders the empty-description case without choking', () => {
      const result = getSkillsInstructions({
        skills: [skill({ description: '' })],
      });
      expect(result).toMatch(/- test-skill \(.+SKILL\.md\): /);
    });
  });
});

describe('getRelevantSkillsPointerInstructions', () => {
  it('renders a static SKILLS section with no per-skill lines', () => {
    const result = getRelevantSkillsPointerInstructions();
    expect(result).toContain('## SKILLS');
    expect(result).toContain('<relevant_skills>');
    expect(result).toContain('search_relevant_skills');
    expect(result).toContain('load_skill');
    // Must not embed any concrete skill list (it takes no skills argument).
    expect(result).not.toMatch(/- \w+ \(.+SKILL\.md\)/);
  });

  it('is deterministic (cacheable) — independent of any skill set', () => {
    expect(getRelevantSkillsPointerInstructions()).toEqual(getRelevantSkillsPointerInstructions());
  });
});

describe('formatRelevantSkillsNotice', () => {
  const relevant = (overrides: Partial<RelevantSkill> = {}): RelevantSkill => ({
    id: 'platform.core.alpha',
    name: 'alpha',
    path: '/skills/platform/core/alpha/SKILL.md',
    description: 'Alpha skill',
    ...overrides,
  });

  it('wraps skills in a <relevant_skills> block with name, path and description', () => {
    const result = formatRelevantSkillsNotice([relevant()]);
    expect(result).toContain('<relevant_skills>');
    expect(result).toContain('</relevant_skills>');
    expect(result).toContain('- alpha (/skills/platform/core/alpha/SKILL.md): Alpha skill');
    expect(result).toContain('load_skill');
  });

  it('renders the optional relevance note on its own indented line', () => {
    const result = formatRelevantSkillsNotice([
      relevant({ relevance_note: 'Matches the user request about X' }),
    ]);
    expect(result).toContain('  Matches the user request about X');
  });

  it('omits the note line when no relevance note is present', () => {
    const result = formatRelevantSkillsNotice([relevant()]);
    const skillLineCount = result.split('\n').filter((line) => line.startsWith('- ')).length;
    expect(skillLineCount).toBe(1);
  });
});

describe('createRelevantSkillsNoticeMessage', () => {
  const relevant = (overrides: Partial<RelevantSkill> = {}): RelevantSkill => ({
    id: 'platform.core.alpha',
    name: 'alpha',
    path: '/skills/platform/core/alpha/SKILL.md',
    description: 'Alpha skill',
    ...overrides,
  });

  it('is a user-role message tagged with the relevant-skills name so it is distinguishable from real user input', () => {
    const message = createRelevantSkillsNoticeMessage([relevant()]);
    expect(isHumanMessage(message)).toBe(true);
    expect(message.name).toBe(RELEVANT_SKILLS_MESSAGE_NAME);
    expect(message.content).toContain('<relevant_skills>');
    expect(message.content).toContain(
      '- alpha (/skills/platform/core/alpha/SKILL.md): Alpha skill'
    );
  });
});
