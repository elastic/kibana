/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, parse, relative, sep } from 'path';
import { z } from '@kbn/zod/v4';
import type { Logger } from '@kbn/logging';
import { maxReferencedContentItems, validateSkillId } from '@kbn/agent-builder-common';
import { skillDefinitionSchema } from '@kbn/agent-builder-server/skills';
import type { DirectoryPath, SkillDefinition } from '@kbn/agent-builder-server/skills';
import { splitFrontmatter } from './split_frontmatter';

const SKILL_FILE_NAME = 'SKILL.md';
const MARKDOWN_EXTENSION = '.md';

const REFERENCE_SEGMENT_REGEX = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/;
const RESERVED_ROOT_REFERENCE_NAME = 'skill';

const frontmatterSchema = z.object({
  name: z.string({ error: 'frontmatter "name" is required and must be a string' }),
  description: z.string({ error: 'frontmatter "description" is required and must be a string' }),
  id: z.string().optional(),
  experimental: z.boolean().optional(),
});

type SkillReferencedContent = NonNullable<SkillDefinition['referencedContent']>[number];

export interface LoadSkillFromDirectoryDeps {
  logger: Logger;
}

/**
 * Loads a {@link SkillDefinition} from a directory containing a top-level `SKILL.md`. Every
 * other `.md` file under that directory becomes referenced content, with its `relativePath`
 * derived from where it sits in the tree (`.` for files alongside `SKILL.md`, then `./sub`,
 * `./sub/deep`).
 *
 * @param absoluteDir - Absolute path to the skill directory.
 * @param basePath - Base path the skill is registered under.
 * @param deps - See {@link LoadSkillFromDirectoryDeps}.
 * @returns The loaded skill, validated against `skillDefinitionSchema`.
 * @throws If `SKILL.md` is missing, the frontmatter is missing or invalid, a markdown file has an
 * unusable name, a reference file is empty, or the resulting skill fails schema validation.
 */
export const loadSkillFromDirectory = (
  absoluteDir: string,
  basePath: DirectoryPath,
  { logger }: LoadSkillFromDirectoryDeps
): SkillDefinition => {
  const skillPath = join(absoluteDir, SKILL_FILE_NAME);
  if (!hasExactSkillFile(absoluteDir)) {
    throw new Error(`loadSkillFromDirectory: no ${SKILL_FILE_NAME} found at "${skillPath}"`);
  }

  const frontmatter = parseFrontmatter(readFileSync(skillPath, 'utf8'), skillPath);

  const id = frontmatter.id ?? frontmatter.name;
  const idError = validateSkillId(id);
  if (idError) {
    throw new Error(
      `loadSkillFromDirectory: invalid skill ID "${id}" in "${skillPath}": ${idError}`
    );
  }

  const referencedContent = collectReferencedContent(absoluteDir, logger);
  if (referencedContent.length > maxReferencedContentItems) {
    throw new Error(
      `loadSkillFromDirectory: skill at "${skillPath}" has ${referencedContent.length} referenced ` +
        `files, but at most ${maxReferencedContentItems} are allowed.`
    );
  }

  const skill: SkillDefinition = {
    id,
    name: frontmatter.name,
    basePath,
    description: frontmatter.description,
    experimental: frontmatter.experimental,
    content: frontmatter.body,
    referencedContent: referencedContent.length ? referencedContent : undefined,
  };

  const result = skillDefinitionSchema.safeParse(skill);
  if (!result.success) {
    throw new Error(
      `loadSkillFromDirectory: invalid skill at "${skillPath}": ${formatZodIssues(result.error)}`
    );
  }

  return skill;
};

const hasExactSkillFile = (absoluteDir: string): boolean => {
  if (!statSync(absoluteDir, { throwIfNoEntry: false })?.isDirectory()) {
    return false;
  }
  return readdirSync(absoluteDir, { withFileTypes: true }).some(
    (entry) => entry.isFile() && entry.name === SKILL_FILE_NAME
  );
};

interface ParsedFrontmatter {
  id?: string;
  name: string;
  description: string;
  experimental?: boolean;
  body: string;
}

const parseFrontmatter = (skillMarkdown: string, skillPath: string): ParsedFrontmatter => {
  const { frontmatter, body } = splitFrontmatter(skillMarkdown);
  if (!frontmatter) {
    throw new Error(
      `loadSkillFromDirectory: ${SKILL_FILE_NAME} at "${skillPath}" must begin with a valid YAML frontmatter block (--- ... ---) that parses to a mapping`
    );
  }

  const result = frontmatterSchema.safeParse(frontmatter);
  if (!result.success) {
    throw new Error(
      `loadSkillFromDirectory: invalid frontmatter in "${skillPath}": ${formatZodIssues(
        result.error
      )}`
    );
  }

  return { ...result.data, body };
};

const collectReferencedContent = (
  absoluteDir: string,
  logger: Logger
): SkillReferencedContent[] => {
  const referencedContent: SkillReferencedContent[] = [];
  const skipped: string[] = [];

  for (const fullPath of walkFiles(absoluteDir)) {
    const relativeFilePath = relative(absoluteDir, fullPath);
    const { dir, base, name, ext } = parse(relativeFilePath);

    if (ext !== MARKDOWN_EXTENSION) {
      skipped.push(relativeFilePath);
      continue;
    }

    const dirSegments = dir ? dir.split(sep) : [];

    if (base === SKILL_FILE_NAME && dirSegments.length === 0) {
      continue;
    }

    if (dirSegments.length === 0 && name.toLowerCase() === RESERVED_ROOT_REFERENCE_NAME) {
      throw new Error(
        `loadSkillFromDirectory: reference file "${relativeFilePath}" uses the reserved name ` +
          `"${name}". ${SKILL_FILE_NAME} already provides the skill's instructions.`
      );
    }

    const invalidSegment = [...dirSegments, name].find(
      (segment) => !REFERENCE_SEGMENT_REGEX.test(segment)
    );
    if (invalidSegment !== undefined) {
      throw new Error(
        `loadSkillFromDirectory: reference file "${relativeFilePath}" has an invalid path segment ` +
          `"${invalidSegment}". Segments must contain only lowercase letters, numbers, hyphens, ` +
          `and underscores, and must start and end with a letter or number.`
      );
    }

    const content = readFileSync(fullPath, 'utf8').trim();
    if (!content) {
      throw new Error(`loadSkillFromDirectory: reference file "${relativeFilePath}" is empty.`);
    }

    referencedContent.push({
      name,
      relativePath: dirSegments.length ? `./${dirSegments.join('/')}` : '.',
      content,
    });
  }

  if (skipped.length > 0) {
    logger.debug(
      `loadSkillFromDirectory: skipped ${skipped.length} non-${MARKDOWN_EXTENSION} file(s) in ` +
        `"${absoluteDir}": ${skipped.join(', ')}`
    );
  }

  return referencedContent;
};

function* walkFiles(dir: string): Generator<string> {
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkFiles(fullPath);
    } else if (entry.isFile()) {
      yield fullPath;
    }
  }
}

const formatZodIssues = (error: z.ZodError): string =>
  error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? `"${issue.path.join('.')}"` : 'root';
      return `${path}: ${issue.message}`;
    })
    .join('; ');
