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
 * Kibana-side configuration for a universal skill, declared in an optional
 * `config.ts` next to the skill's `SKILL.md`. Lets a skill wire up the
 * {@link SkillDefinition} fields that cannot be expressed in markdown.
 */
export type ElasticSkillConfig = Pick<SkillDefinition, 'availability' | 'getRegistryTools'>;

/**
 * Loads the universal skills from `elastic/agent-skills`.
 *
 * Each skill directory is loaded from its `SKILL.md`. When the directory also
 * holds a `config.ts` exporting a `config` of type {@link ElasticSkillConfig},
 * those fields are applied on top of the loaded definition.
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
    const skillDir = join(skillsDir, dirName);
    try {
      const skill = loadSkillFromDirectory(skillDir, ELASTIC_SKILLS_BASE_PATH, { logger });
      const config = loadSkillConfig(skillDir);
      skills.push(config ? { ...skill, ...config } : skill);
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

/**
 * Resolves the skill's optional `config` module (`config.ts` in source,
 * `config.js` in the distributable). Returns `undefined` when the skill has
 * none; throws when one exists but does not export a `config` object.
 */
const loadSkillConfig = (skillDir: string): ElasticSkillConfig | undefined => {
  let configPath: string;
  try {
    configPath = require.resolve(join(skillDir, 'config'));
  } catch {
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { config } = require(configPath) as { config?: ElasticSkillConfig };
  if (typeof config !== 'object' || config === null) {
    throw new Error(`skill config at "${configPath}" must export a "config" object`);
  }
  return config;
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
