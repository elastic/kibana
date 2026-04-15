/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IFileStore } from '@kbn/agent-builder-server/runner';
import { cleanPrompt } from '@kbn/agent-builder-genai-utils/prompts';
import { isSkillFileEntry } from '../../../runner/store/volumes/skills/utils';
import type { SkillFileEntry } from '../../../runner/store/volumes/skills/types';

export const getSkillsInstructions = async ({
  filesystem,
}: {
  filesystem: IFileStore;
}): Promise<string> => {
  const fileEntries = await filesystem.glob('/**/SKILL.md');
  const skillsFileEntries = fileEntries
    .filter(isSkillFileEntry)
    .toSorted((a, b) => a.path.localeCompare(b.path));

  const skillToLine = (entry: SkillFileEntry) => {
    return `- ${entry.metadata.skill_name} (${entry.path}): ${entry.metadata.skill_description}`;
  };

  if (skillsFileEntries.length === 0) {
    return [
      '## SKILLS',
      'Load a skill to get detailed instructions for a specific task. No skills are currently available.',
    ].join('\n');
  }

  return cleanPrompt(`
## SKILLS

Skills provide specialized instructions and tools for specific tasks.
Loading a skill may also unlock dedicated tools that are more accurate than general-purpose alternatives.

### Available skills

${skillsFileEntries.map(skillToLine).join('\n')}

### How to load a skill

Read the skill's file path using the \`filestore.read\` tool. Any tools provided by the skill will become available automatically.

### When to load skills

**Always check the skill list above before acting on a user request.** Load a skill when:

1. **The user explicitly requests it** — by name (e.g. "use the root-cause-analysis skill"), by slash prefix (e.g. "/search ..."), or by markdown link (e.g. "[/visualization-creation](skill://visualization-creation)").
2. **A skill clearly matches the task at hand** — even if the user didn't mention it. When you auto-load a skill this way, mention it in your response.

If multiple skills are relevant, load all of them.

### Following skill instructions

Once loaded, follow the skill's instructions to perform the task. Skill instructions take precedence over general-purpose approaches, but explicit user instructions always take priority over skill instructions.

`);
};
