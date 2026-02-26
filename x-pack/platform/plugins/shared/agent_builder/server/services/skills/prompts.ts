/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IFileStore } from '@kbn/agent-builder-server/runner';
import { generateXmlTree } from '@kbn/agent-builder-genai-utils/tools/utils';
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

  const skillPrompt =
    skillsFileEntries.length === 0
      ? [
          '## SKILLS',
          'Load a skill to get detailed instructions for a specific task. No skills are currently available.',
        ].join('\n')
      : [
          '## SKILLS',
          [
            'Before using any general-purpose tool or model knowledge, you MUST first check the available skills below.',
            'If ANY skill description matches or is relevant to the user query, you MUST load it by calling `filestore.read` with the skill path BEFORE calling any other tool.',
            'Skills provide specialized knowledge, domain-specific instructions, and access to inline tools that produce more accurate results than general-purpose alternatives.',
            'Skipping a relevant skill and going directly to general tools (e.g., search, execute_esql) is a protocol violation.',
            'Only the skills listed here are available:',
          ].join(' '),
          generateXmlTree({
            tagName: 'available_skills',
            children: skillsFileEntries.map((skillFileEntry) => ({
              tagName: 'skill',
              attributes: {
                path: skillFileEntry.path,
              },
              children: [
                { tagName: 'name', children: [skillFileEntry.metadata.skill_name] },
                { tagName: 'description', children: [skillFileEntry.metadata.skill_description] },
              ],
            })),
          }),
        ].join('\n');

  return skillPrompt;
};
