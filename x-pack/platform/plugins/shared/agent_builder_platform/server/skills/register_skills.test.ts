/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import { loggerMock } from '@kbn/logging-mocks';
import { registerSkills } from './register_skills';
import { contextEngineSkillAvailability } from './context_engine_skill_availability';

const registerAllSkills = (): SkillDefinition[] => {
  const registered: SkillDefinition[] = [];
  const agentBuilder = {
    skills: { register: (skill: SkillDefinition) => registered.push(skill) },
  } as unknown as AgentBuilderPluginSetup;

  registerSkills(agentBuilder, async () => ({} as never), loggerMock.create());

  return registered;
};

describe('registerSkills', () => {
  // A missing skill fails `toMatchObject`, so this also guards against the upstream sync renaming
  // or dropping the Context Engine skill, which would silently remove its gating.
  it('gates the synced Context Engine skill on both the experimental flag and Context Engine setting', () => {
    const contextEngineSkill = registerAllSkills().find(
      (skill) => skill.id === 'kibana-context-engine'
    );

    expect(contextEngineSkill).toMatchObject({
      // From the skill's SKILL.md frontmatter; gates the `agentBuilder:experimental` flag.
      experimental: true,
      // Wired in `register_skills.ts` because markdown frontmatter cannot express a runtime handler.
      availability: contextEngineSkillAvailability,
    });
  });
});
