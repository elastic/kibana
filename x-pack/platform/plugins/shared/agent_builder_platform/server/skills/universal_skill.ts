/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';
import type { SkillDefinition, ReferencedContent } from '@kbn/agent-builder-server/skills/type_definition';

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;
const REFERENCE_NAME_RE = /^[a-z0-9-_]+$/;

interface UniversalSkillOptions {
  references?: ReferencedContent[];
}

interface SkillFrontmatter {
  name?: unknown;
  id?: unknown;
  description?: unknown;
  basePath?: unknown;
  experimental?: unknown;
}

export class UniversalSkill implements SkillDefinition {
  readonly id: string;
  readonly name: SkillDefinition['name'];
  readonly basePath: SkillDefinition['basePath'];
  readonly description: string;
  readonly content: string;
  readonly experimental?: boolean;
  readonly referencedContent?: ReferencedContent[];

  constructor(skillMarkdown: string, options: UniversalSkillOptions = {}) {
    const match = FRONTMATTER_RE.exec(skillMarkdown);
    if (!match) {
      throw new Error(
        'UniversalSkill: SKILL.md must begin with a YAML frontmatter block (--- ... ---)'
      );
    }

    const [, frontmatterYaml, body] = match;
    const fm = yaml.load(frontmatterYaml) as SkillFrontmatter;

    const missing: string[] = [];
    if (!fm.name) missing.push('name');
    if (!fm.description) missing.push('description');
    if (!fm.basePath) missing.push('basePath');
    if (missing.length > 0) {
      throw new Error(
        `UniversalSkill: missing required frontmatter fields: ${missing.join(', ')}`
      );
    }

    this.name = String(fm.name) as SkillDefinition['name'];
    this.id = fm.id ? String(fm.id) : this.name;
    this.basePath = String(fm.basePath) as SkillDefinition['basePath'];
    this.description = String(fm.description).trim();
    this.content = body.trimStart();
    this.experimental = fm.experimental === true ? true : undefined;
    this.referencedContent = options.references;
  }

  static fromDirectory(absoluteDir: string): UniversalSkill {
    const skillPath = join(absoluteDir, 'SKILL.md');
    const skillMarkdown = readFileSync(skillPath, 'utf8');

    const referencesDir = join(absoluteDir, 'references');
    const references: ReferencedContent[] = [];

    if (existsSync(referencesDir)) {
      const files = readdirSync(referencesDir).filter((f) => f.endsWith('.md'));
      for (const file of files) {
        const refName = file.slice(0, -'.md'.length);
        if (!REFERENCE_NAME_RE.test(refName)) {
          throw new Error(
            `UniversalSkill.fromDirectory: reference filename "${file}" is invalid. ` +
              'Filenames (without .md) must match /^[a-z0-9-_]+$/.'
          );
        }
        references.push({
          name: refName,
          relativePath: './references',
          content: readFileSync(join(referencesDir, file), 'utf8'),
        });
      }
    }

    return new UniversalSkill(skillMarkdown, { references: references.length ? references : undefined });
  }
}
