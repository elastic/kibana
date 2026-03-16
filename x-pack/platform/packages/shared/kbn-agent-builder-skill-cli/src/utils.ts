/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import Fs from 'fs';
import type { ToolingLog } from '@kbn/tooling-log';
import { REPO_ROOT } from '@kbn/repo-info';
import { VALID_DOMAINS, SKILL_NAME_REGEX, MAX_SKILL_NAME_LENGTH } from './constants';
import type { SkillDomain } from './constants';

export function resolveRepoRoot(): string {
  return REPO_ROOT;
}

export function validateSkillName(name: string): void {
  if (!name || name.length === 0) {
    throw new Error('Skill name is required');
  }
  if (name.length > MAX_SKILL_NAME_LENGTH) {
    throw new Error(`Skill name must be at most ${MAX_SKILL_NAME_LENGTH} characters`);
  }
  if (!SKILL_NAME_REGEX.test(name)) {
    throw new Error(
      'Skill name must contain only lowercase letters, numbers, underscores, and hyphens'
    );
  }
}

export function validateDomain(domain: string): asserts domain is SkillDomain {
  if (!VALID_DOMAINS.includes(domain as SkillDomain)) {
    throw new Error(`Invalid domain "${domain}". Must be one of: ${VALID_DOMAINS.join(', ')}`);
  }
}

export function toSnakeCase(str: string): string {
  return str.replace(/-/g, '_');
}

export function toCamelCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('');
}

export function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Discovers skill files in a plugin directory by recursively searching
 * for files that contain `defineSkillType`.
 */
export function discoverSkillFiles(
  repoRoot: string,
  pluginPath: string,
  log: ToolingLog
): string[] {
  const skillsDir = Path.join(repoRoot, pluginPath, 'skills');
  if (!Fs.existsSync(skillsDir)) {
    log.warning(`Skills directory not found: ${skillsDir}`);
    return [];
  }

  const results: string[] = [];

  function walk(dir: string) {
    const entries = Fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = Path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '__evals__' || entry.name === 'inline_tools' || entry.name === 'tools') {
          continue;
        }
        walk(fullPath);
      } else if (
        entry.name.endsWith('.ts') &&
        !entry.name.endsWith('.test.ts') &&
        entry.name !== 'register_skills.ts'
      ) {
        const content = Fs.readFileSync(fullPath, 'utf-8');
        if (content.includes('defineSkillType')) {
          results.push(fullPath);
        }
      }
    }
  }

  walk(skillsDir);
  return results;
}

/**
 * Finds a specific skill file by name within the plugin's skills directory.
 * Handles both flat files (e.g., alert_analysis_skill.ts) and nested
 * directories (e.g., entity_analytics/entity_analytics_skill.ts).
 */
export function findSkillFile(
  repoRoot: string,
  pluginPath: string,
  skillName: string
): string | null {
  const snakeName = toSnakeCase(skillName);
  const skillsDir = Path.join(repoRoot, pluginPath, 'skills');
  if (!Fs.existsSync(skillsDir)) {
    return null;
  }

  const candidates = [
    Path.join(skillsDir, `${snakeName}_skill.ts`),
    Path.join(skillsDir, snakeName, `${snakeName}_skill.ts`),
    Path.join(skillsDir, snakeName, 'index.ts'),
  ];

  for (const candidate of candidates) {
    if (Fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Discovers tool files in a plugin directory by searching for files
 * that export tool definitions with Zod schemas.
 */
export function discoverToolFiles(repoRoot: string, pluginPath: string, log: ToolingLog): string[] {
  const toolsDir = Path.join(repoRoot, pluginPath, 'tools');
  if (!Fs.existsSync(toolsDir)) {
    log.warning(`Tools directory not found: ${toolsDir}`);
    return [];
  }

  const files: string[] = [];
  const entries = Fs.readdirSync(toolsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const toolFile = Path.join(toolsDir, entry.name, 'tool.ts');
      if (Fs.existsSync(toolFile)) {
        files.push(toolFile);
      }
    } else if (entry.name.endsWith('_tool.ts')) {
      files.push(Path.join(toolsDir, entry.name));
    }
  }

  return files;
}

export interface SkillFileMetadata {
  id: string;
  name: string;
  description: string;
  content: string;
  basePath: string;
  tools: string[];
}

/**
 * Extracts metadata from a skill definition file using regex.
 * Parses name, description, content, basePath, and tool IDs.
 */
export function extractSkillMetadata(filePath: string): SkillFileMetadata {
  const source = Fs.readFileSync(filePath, 'utf-8');

  const idMatch = source.match(/id:\s*['"]([^'"]+)['"]/);
  const nameMatch = source.match(/name:\s*['"]([^'"]+)['"]/);
  const basePathMatch = source.match(/basePath:\s*['"]([^'"]+)['"]/);
  const descMatch = source.match(/description:\s*\n?\s*['"`]([^'"`]+)['"`]/s);
  const contentMatch = source.match(/content:\s*`([^`]*)`/s);
  const toolMatches = source.match(/['"]([a-z]+\.[a-z._]+)['"]/g);

  return {
    id: idMatch?.[1] ?? 'unknown',
    name: nameMatch?.[1] ?? 'unknown',
    description: descMatch?.[1]?.trim() ?? '',
    content: contentMatch?.[1]?.trim() ?? '',
    basePath: basePathMatch?.[1] ?? '',
    tools:
      toolMatches
        ?.map((t) => t.replace(/['"]/g, ''))
        .filter((t) => t.includes('.') && !t.includes('/') && !t.includes('@')) ?? [],
  };
}

export function ensureDir(dirPath: string): void {
  if (!Fs.existsSync(dirPath)) {
    Fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function writeFile(
  filePath: string,
  content: string,
  log: ToolingLog,
  force = false
): boolean {
  if (Fs.existsSync(filePath) && !force) {
    log.warning(`File already exists, skipping: ${filePath}`);
    return false;
  }
  ensureDir(Path.dirname(filePath));
  Fs.writeFileSync(filePath, content, 'utf-8');
  log.success(`Created: ${filePath}`);
  return true;
}
