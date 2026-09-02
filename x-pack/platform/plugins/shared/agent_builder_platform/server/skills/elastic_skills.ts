/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readdirSync } from 'fs';
import { join } from 'path';
import type { Logger } from '@kbn/logging';
import { loadSkillFromDirectory } from '@kbn/agent-builder-skill-loader';
import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import { ELASTIC_SKILLS_BASE_PATH } from '@kbn/agent-builder-server/skills';

export { ELASTIC_SKILLS_BASE_PATH };

const DEFAULT_ELASTIC_SKILLS_DIR = join(__dirname, 'elastic-skills');

/**
 * Loads the universal skills from `elastic/agent-skills`.
 *
 * @param deps - Dependencies. `logger` receives one error per skill that fails
 * to load.
 * @param skillsDir - Directory holding one subdirectory per skill. Defaults to
 * the `elastic-skills` directory alongside this file.
 * @returns The skills that loaded successfully.
 */
export const loadElasticSkills = (
  { logger }: { logger: Logger },
  skillsDir: string = DEFAULT_ELASTIC_SKILLS_DIR
): SkillDefinition[] => {
  const skills: SkillDefinition[] = [];

  for (const dirName of skillDirNames(skillsDir)) {
    try {
      skills.push(
        loadSkillFromDirectory(join(skillsDir, dirName), ELASTIC_SKILLS_BASE_PATH, { logger })
      );
    } catch (error) {
      logger.error(
        `Failed to load skill "${dirName}", skipping it: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  return skills;
};

const skillDirNames = (skillsDir: string): string[] => {
  let entries;
  try {
    entries = readdirSync(skillsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort();
};
