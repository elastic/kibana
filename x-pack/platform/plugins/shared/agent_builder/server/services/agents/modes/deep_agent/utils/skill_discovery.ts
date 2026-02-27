/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/agent-builder-common/skills';

/**
 * Groups skills by their top-level domain (first segment of namespace).
 */
export const groupSkillsByDomain = (skills: Skill[]): Record<string, Skill[]> => {
  const groups: Record<string, Skill[]> = {};
  for (const skill of skills) {
    const domain = skill.namespace.split('.')[0];
    if (!groups[domain]) {
      groups[domain] = [];
    }
    groups[domain].push(skill);
  }
  return groups;
};

/**
 * Generates a human-readable summary of available skills for prompt injection.
 */
export const generateSkillSummary = (skills: Skill[]): string => {
  if (skills.length === 0) {
    return 'No skills available.';
  }

  const lines = skills.map(
    (skill) => `- **${skill.namespace}** (${skill.name}): ${skill.description}`
  );
  return `### Available Skills\n${lines.join('\n')}`;
};
