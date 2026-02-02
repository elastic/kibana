/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IFileStore } from '@kbn/agent-builder-server/runner';
import { isSkillFileEntry } from '../runner/store/volumes/skills/utils';

export const getSkillsInstructions = async ({
  filesystem,
}: {
  filesystem: IFileStore;
}): Promise<string> => {
  const fileEntries = await filesystem.glob('/**/SKILL.md');
  const skillsFileEntries = fileEntries
    .filter(isSkillFileEntry)
    .toSorted((a, b) => a.path.localeCompare(b.path));

  const description =
    skillsFileEntries.length === 0
      ? [
          '## SKILLS',
          'Load a skill to get detailed instructions for a specific task. No skills are currently available.',
        ].join('\n')
      : [
          '## SKILLS',
          [
            'Load a skill to get detailed instructions for a specific task.',
            'Skills provide specialized knowledge and step-by-step guidance.',
            "Use this when a task matches an available skill's description.",
            'Only the skills listed here are available:',
          ].join(' '),
          '<available_skills>',
          ...skillsFileEntries.flatMap((skillFileEntry) => [
            `    <skill path="${skillFileEntry.path}">`,
            `      <name>${skillFileEntry.metadata.skill_name}</name>`,
            `      <description>${skillFileEntry.metadata.skill_description}</description>`,
            `    </skill>`,
          ]),
          '</available_skills>',
        ].join('\n');

  return description;
};
