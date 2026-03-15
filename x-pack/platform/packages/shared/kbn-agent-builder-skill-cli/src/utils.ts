/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import Fs from 'fs';
import type { ToolingLog } from '@kbn/tooling-log';
import { VALID_DOMAINS, SKILL_NAME_REGEX, MAX_SKILL_NAME_LENGTH } from './constants';
import type { SkillDomain } from './constants';

export function resolveRepoRoot(): string {
  return process.cwd();
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
    throw new Error(
      `Invalid domain "${domain}". Must be one of: ${VALID_DOMAINS.join(', ')}`
    );
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
 * Discovers skill files in a plugin directory by searching for files
 * that import and call `defineSkillType`.
 */
export function discoverSkillFiles(repoRoot: string, pluginPath: string, log: ToolingLog): string[] {
  const skillsDir = Path.join(repoRoot, pluginPath, 'skills');
  if (!Fs.existsSync(skillsDir)) {
    log.warning(`Skills directory not found: ${skillsDir}`);
    return [];
  }

  return Fs.readdirSync(skillsDir)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && f !== 'index.ts' && f !== 'register_skills.ts')
    .map((f) => Path.join(skillsDir, f));
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
    } else if (
      entry.name.endsWith('_tool.ts') &&
      !entry.name.endsWith('.test.ts')
    ) {
      files.push(Path.join(toolsDir, entry.name));
    }
  }

  return files;
}

export function ensureDir(dirPath: string): void {
  if (!Fs.existsSync(dirPath)) {
    Fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function writeFileIfNotExists(filePath: string, content: string, log: ToolingLog): boolean {
  if (Fs.existsSync(filePath)) {
    log.warning(`File already exists, skipping: ${filePath}`);
    return false;
  }
  ensureDir(Path.dirname(filePath));
  Fs.writeFileSync(filePath, content, 'utf-8');
  log.success(`Created: ${filePath}`);
  return true;
}
