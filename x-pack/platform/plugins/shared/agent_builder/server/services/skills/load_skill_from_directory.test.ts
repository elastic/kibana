/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadSkillFromDirectory } from './load_skill_from_directory';

const BASE_PATH = 'skills/platform/discover' as const;

const makeSkillDir = (skillMd: string, references?: Record<string, string>): string => {
  const dir = mkdtempSync(join(tmpdir(), 'skill-test-'));
  writeFileSync(join(dir, 'SKILL.md'), skillMd, 'utf8');
  if (references) {
    const refDir = join(dir, 'references');
    mkdirSync(refDir);
    for (const [name, content] of Object.entries(references)) {
      writeFileSync(join(refDir, name), content, 'utf8');
    }
  }
  return dir;
};

const cleanup: string[] = [];
afterAll(() => {
  for (const dir of cleanup) {
    rmSync(dir, { recursive: true, force: true });
  }
});

const tmpDir = (skillMd: string, references?: Record<string, string>): string => {
  const dir = makeSkillDir(skillMd, references);
  cleanup.push(dir);
  return dir;
};

describe('loadSkillFromDirectory', () => {
  it('loads a valid SKILL.md with no references', () => {
    const dir = tmpDir(`---
name: my-skill
description: A great skill
---

Skill body content.
`);

    const skill = loadSkillFromDirectory(dir, BASE_PATH);

    expect(skill.id).toBe('my-skill');
    expect(skill.name).toBe('my-skill');
    expect(skill.basePath).toBe(BASE_PATH);
    expect(skill.description).toBe('A great skill');
    expect(skill.content).toBe('Skill body content.\n');
    expect(skill.referencedContent).toBeUndefined();
    expect(skill.experimental).toBeUndefined();
  });

  it('uses explicit id from frontmatter when provided', () => {
    const dir = tmpDir(`---
name: my-skill
id: stable-id
description: A great skill
---

Body.
`);

    const skill = loadSkillFromDirectory(dir, BASE_PATH);
    expect(skill.id).toBe('stable-id');
    expect(skill.name).toBe('my-skill');
  });

  it('sets experimental when frontmatter experimental is true', () => {
    const dir = tmpDir(`---
name: my-skill
description: A great skill
experimental: true
---

Body.
`);

    const skill = loadSkillFromDirectory(dir, BASE_PATH);
    expect(skill.experimental).toBe(true);
  });

  it('loads references from references/ sub-folder', () => {
    const dir = tmpDir(
      `---
name: my-skill
description: A great skill
---

Body.
`,
      { 'ref-one.md': 'Reference one content.', 'ref-two.md': 'Reference two content.' }
    );

    const skill = loadSkillFromDirectory(dir, BASE_PATH);
    expect(skill.referencedContent).toHaveLength(2);

    const names = skill.referencedContent!.map((r) => r.name).sort();
    expect(names).toEqual(['ref-one', 'ref-two']);

    for (const ref of skill.referencedContent!) {
      expect(ref.relativePath).toBe('./references');
    }
  });

  it('uses basePath from the parameter, not frontmatter', () => {
    const dir = tmpDir(`---
name: my-skill
basePath: skills/security/rules
description: A great skill
---

Body.
`);

    const skill = loadSkillFromDirectory(dir, BASE_PATH);
    expect(skill.basePath).toBe(BASE_PATH);
  });

  it('throws when SKILL.md has no frontmatter block', () => {
    const dir = tmpDir('No frontmatter here, just plain markdown.');

    expect(() => loadSkillFromDirectory(dir, BASE_PATH)).toThrow(
      'must begin with a YAML frontmatter block'
    );
  });

  it('throws when name is missing from frontmatter', () => {
    const dir = tmpDir(`---
description: A great skill
---

Body.
`);

    expect(() => loadSkillFromDirectory(dir, BASE_PATH)).toThrow(/name/);
  });

  it('throws when description is missing from frontmatter', () => {
    const dir = tmpDir(`---
name: my-skill
---

Body.
`);

    expect(() => loadSkillFromDirectory(dir, BASE_PATH)).toThrow(/description/);
  });

  it('throws when a reference filename contains invalid characters', () => {
    const dir = tmpDir(
      `---
name: my-skill
description: A great skill
---

Body.
`,
      { 'Invalid File Name.md': 'Content.' }
    );

    expect(() => loadSkillFromDirectory(dir, BASE_PATH)).toThrow(
      'reference file "Invalid File Name.md"'
    );
  });
});
