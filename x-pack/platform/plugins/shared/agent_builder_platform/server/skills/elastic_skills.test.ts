/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { loadElasticSkills, ELASTIC_SKILLS_BASE_PATH } from './elastic_skills';

const ELASTIC_SKILLS_DIR = join(__dirname, 'elastic-skills');

const skillMarkdown = (name: string): string =>
  ['---', `name: ${name}`, `description: The ${name} skill.`, '---', '', 'Body content.'].join(
    '\n'
  );

const writeSkill = (root: string, dirName: string, contents: string): void => {
  const dir = join(root, dirName);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'SKILL.md'), contents, 'utf8');
};

describe('loadElasticSkills', () => {
  let logger: MockedLogger;
  let root: string;

  beforeEach(() => {
    logger = loggerMock.create();
    root = mkdtempSync(join(tmpdir(), 'elastic-skills-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('returns an empty list for an empty directory', () => {
    expect(loadElasticSkills({ logger }, root)).toEqual([]);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('returns an empty list when the directory does not exist', () => {
    expect(loadElasticSkills({ logger }, join(root, 'absent'))).toEqual([]);
  });

  it('loads every skill directory under the elastic-skills base path', () => {
    writeSkill(root, 'beta-skill', skillMarkdown('beta-skill'));
    writeSkill(root, 'alpha-skill', skillMarkdown('alpha-skill'));

    const skills = loadElasticSkills({ logger }, root);

    expect(skills.map((skill) => skill.id)).toEqual(['alpha-skill', 'beta-skill']);
    expect(skills.map((skill) => skill.basePath)).toEqual([
      ELASTIC_SKILLS_BASE_PATH,
      ELASTIC_SKILLS_BASE_PATH,
    ]);
  });

  it('ignores loose files and dot-prefixed directories', () => {
    writeSkill(root, 'a-skill', skillMarkdown('a-skill'));
    writeFileSync(join(root, 'README.md'), '# Elastic skills\n', 'utf8');
    mkdirSync(join(root, '.staging'), { recursive: true });

    expect(loadElasticSkills({ logger }, root).map((skill) => skill.id)).toEqual(['a-skill']);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('skips a malformed skill instead of throwing, so the rest still load', () => {
    writeSkill(root, 'broken-skill', 'no frontmatter here');
    writeSkill(root, 'good-skill', skillMarkdown('good-skill'));

    const skills = loadElasticSkills({ logger }, root);

    expect(skills.map((skill) => skill.id)).toEqual(['good-skill']);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error.mock.calls[0][0]).toContain('broken-skill');
  });
});

// Guards the skills copied in from `elastic/agent-skills`.
describe('the elastic-skills directory', () => {
  const dirNames = existsSync(ELASTIC_SKILLS_DIR)
    ? readdirSync(ELASTIC_SKILLS_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
        .map((entry) => entry.name)
        .sort()
    : [];

  const logger = loggerMock.create();
  const skills = loadElasticSkills({ logger }, ELASTIC_SKILLS_DIR);

  it('exists for the sync job to write into', () => {
    expect(existsSync(ELASTIC_SKILLS_DIR)).toBe(true);
  });

  it('loads every skill it holds', () => {
    expect(skills.map((skill) => skill.id)).toHaveLength(dirNames.length);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('holds each skill in a directory named after its skill ID', () => {
    expect(skills.map((skill) => skill.id)).toEqual(dirNames);
  });

  it('does not contain duplicate skill IDs', () => {
    const ids = skills.map((skill) => skill.id);

    expect(ids).toHaveLength(new Set(ids).size);
  });

  it('gives every skill a description and a body', () => {
    for (const skill of skills) {
      expect(skill.description).toBeTruthy();
      expect(skill.content).toBeTruthy();
    }
  });
});
