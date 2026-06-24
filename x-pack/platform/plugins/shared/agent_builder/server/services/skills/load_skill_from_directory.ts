/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { skillDefinitionSchema } from '@kbn/agent-builder-server/skills';
import type { SkillDefinition, DirectoryPath } from '@kbn/agent-builder-server/skills';
import { splitFrontmatter } from '../plugins/utils/parsing/parse_skill_file';

const REFERENCE_NAME_RE = /^[a-z0-9-_]+$/;

/**
 * Loads a SkillDefinition from a directory that contains a SKILL.md file and
 * an optional references/ sub-folder of .md files.
 *
 * The SKILL.md frontmatter must contain:
 * - `name`        — skill name (lowercase letters, numbers, hyphens, underscores; max 64 chars)
 * - `description` — what the skill does and when to use it (max 1024 chars)
 *
 * Optional frontmatter fields:
 * - `id`           — stable unique identifier (defaults to `name` when omitted)
 * - `experimental` — when `true`, only available with experimental features enabled
 *
 * `basePath` must NOT be in the frontmatter; it is supplied by the caller via the
 * `basePath` parameter so it stays visible and type-checked at registration sites.
 */
export const loadSkillFromDirectory = (
  absoluteDir: string,
  basePath: DirectoryPath
): SkillDefinition => {
  const skillPath = join(absoluteDir, 'SKILL.md');
  const skillMarkdown = readFileSync(skillPath, 'utf8');

  const { frontmatter, body } = splitFrontmatter(skillMarkdown);
  if (!frontmatter) {
    throw new Error(
      `loadSkillFromDirectory: SKILL.md at "${skillPath}" must begin with a YAML frontmatter block (--- ... ---)`
    );
  }

  const referencesDir = join(absoluteDir, 'references');
  const referencedContent: SkillDefinition['referencedContent'] = [];

  if (existsSync(referencesDir)) {
    const files = readdirSync(referencesDir).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      const refName = file.slice(0, -'.md'.length);
      if (!REFERENCE_NAME_RE.test(refName)) {
        throw new Error(
          `loadSkillFromDirectory: reference file "${file}" in "${referencesDir}" is invalid. ` +
            'Filenames (without .md) must match /^[a-z0-9-_]+$/.'
        );
      }
      referencedContent.push({
        name: refName,
        relativePath: './references',
        content: readFileSync(join(referencesDir, file), 'utf8'),
      });
    }
  }

  const skill: SkillDefinition = {
    id: (frontmatter.id ?? frontmatter.name) as SkillDefinition['id'],
    name: frontmatter.name as SkillDefinition['name'],
    basePath,
    description: frontmatter.description as SkillDefinition['description'],
    experimental: frontmatter.experimental === true ? true : undefined,
    content: body.trimStart(),
    referencedContent: referencedContent.length ? referencedContent : undefined,
  };

  skillDefinitionSchema.parse(skill);

  return skill;
};
