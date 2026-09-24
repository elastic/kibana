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

  describe('skill config loading', () => {
    const writeConfig = (dirName: string, fileName: string, contents: string): void => {
      writeFileSync(join(root, dirName, fileName), contents, 'utf8');
    };

    it("applies the fields exported by a skill's config.ts", async () => {
      writeSkill(root, 'configured-skill', skillMarkdown('configured-skill'));
      writeConfig(
        'configured-skill',
        'config.ts',
        [
          'export const config = {',
          "  availability: { cacheMode: 'space', handler: async () => ({ status: 'available' }) },",
          "  getRegistryTools: () => ['platform.core.search'],",
          '};',
        ].join('\n')
      );

      const skills = loadElasticSkills({ logger }, root);

      expect(skills).toHaveLength(1);
      expect(skills[0].availability).toMatchObject({ cacheMode: 'space' });
      expect(await skills[0].getRegistryTools?.()).toEqual(['platform.core.search']);
      // The markdown-derived fields are untouched.
      expect(skills[0].content).toContain('Body content.');
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('loads a config.js module, the shape the distributable ships', async () => {
      writeSkill(root, 'dist-skill', skillMarkdown('dist-skill'));
      writeConfig(
        'dist-skill',
        'config.js',
        "module.exports.config = { getRegistryTools: () => ['platform.core.search'] };\n"
      );

      const skills = loadElasticSkills({ logger }, root);

      expect(skills).toHaveLength(1);
      expect(await skills[0].getRegistryTools?.()).toEqual(['platform.core.search']);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('skips a skill whose config does not export a config object', () => {
      writeSkill(root, 'bad-config-skill', skillMarkdown('bad-config-skill'));
      writeConfig('bad-config-skill', 'config.ts', "export const notConfig = 'oops';\n");
      writeSkill(root, 'good-skill', skillMarkdown('good-skill'));

      const skills = loadElasticSkills({ logger }, root);

      expect(skills.map((skill) => skill.id)).toEqual(['good-skill']);
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error.mock.calls[0][0]).toContain('bad-config-skill');
    });

    it('skips a skill whose config exports a non-object config', () => {
      writeSkill(root, 'string-config-skill', skillMarkdown('string-config-skill'));
      writeConfig('string-config-skill', 'config.ts', "export const config = 'not an object';\n");

      expect(loadElasticSkills({ logger }, root)).toEqual([]);
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error.mock.calls[0][0]).toContain('string-config-skill');
    });

    it('skips a skill whose config throws on load, so the rest still load', () => {
      writeSkill(root, 'throwing-config-skill', skillMarkdown('throwing-config-skill'));
      writeConfig('throwing-config-skill', 'config.ts', "throw new Error('boom');\n");
      writeSkill(root, 'good-skill', skillMarkdown('good-skill'));

      const skills = loadElasticSkills({ logger }, root);

      expect(skills.map((skill) => skill.id)).toEqual(['good-skill']);
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error.mock.calls[0][0]).toContain('throwing-config-skill');
      expect(logger.error.mock.calls[0][0]).toContain('boom');
    });
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
