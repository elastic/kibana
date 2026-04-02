/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readCommands, resolveCommandFiles } from './parse_command_files';
import type { ZipArchive } from '../archive';
import type { PluginManifest } from '@kbn/agent-builder-common';

const createMockArchive = (files: Record<string, string>): ZipArchive => {
  return {
    hasEntry: (path: string) => path in files,
    getEntryPaths: () => Object.keys(files),
    getEntryContent: async (path: string) => {
      if (!(path in files)) {
        throw new Error(`Entry ${path} not found in archive`);
      }
      return Buffer.from(files[path], 'utf-8');
    },
    close: jest.fn(),
  };
};

describe('resolveCommandFiles', () => {
  const baseManifest: PluginManifest = { name: 'test' };

  it('finds .md files under the default commands/ directory', () => {
    const archive = createMockArchive({
      'commands/': '',
      'commands/deploy.md': '',
      'commands/status.md': '',
      'commands/nested/deep.md': '',
    });

    const result = resolveCommandFiles(archive, baseManifest);

    expect(result).toContain('commands/deploy.md');
    expect(result).toContain('commands/status.md');
    expect(result).toContain('commands/nested/deep.md');
  });

  it('ignores non-.md files under commands/', () => {
    const archive = createMockArchive({
      'commands/': '',
      'commands/deploy.md': '',
      'commands/readme.txt': '',
      'commands/config.json': '',
    });

    const result = resolveCommandFiles(archive, baseManifest);

    expect(result).toEqual(['commands/deploy.md']);
  });

  it('resolves a custom .md file path from the manifest', () => {
    const archive = createMockArchive({
      'custom/cmd.md': '',
    });
    const manifest: PluginManifest = { name: 'test', commands: './custom/cmd.md' };

    const result = resolveCommandFiles(archive, manifest);

    expect(result).toContain('custom/cmd.md');
  });

  it('resolves a custom directory path from the manifest', () => {
    const archive = createMockArchive({
      'my-commands/': '',
      'my-commands/build.md': '',
      'my-commands/test.md': '',
    });
    const manifest: PluginManifest = { name: 'test', commands: './my-commands' };

    const result = resolveCommandFiles(archive, manifest);

    expect(result).toContain('my-commands/build.md');
    expect(result).toContain('my-commands/test.md');
  });

  it('resolves multiple custom paths from the manifest', () => {
    const archive = createMockArchive({
      'a/one.md': '',
      'b/two.md': '',
    });
    const manifest: PluginManifest = { name: 'test', commands: ['./a/', './b/two.md'] };

    const result = resolveCommandFiles(archive, manifest);

    expect(result).toContain('a/one.md');
    expect(result).toContain('b/two.md');
  });

  it('returns empty array when no commands exist', () => {
    const archive = createMockArchive({
      'skills/my-skill/SKILL.md': '',
    });

    const result = resolveCommandFiles(archive, baseManifest);

    expect(result).toEqual([]);
  });
});

describe('readCommands', () => {
  const baseManifest: PluginManifest = { name: 'test' };

  it('converts command .md files into ParsedSkillFile entries', async () => {
    const archive = createMockArchive({
      'commands/': '',
      'commands/deploy.md': 'Deploy instructions.',
      'commands/rollback.md': 'Rollback instructions.',
    });

    const result = await readCommands(archive, baseManifest);

    expect(result).toHaveLength(2);
    const deploy = result.find((c) => c.dirName === 'deploy')!;
    expect(deploy.content).toBe('Deploy instructions.');
    expect(deploy.referencedFiles).toEqual([]);

    const rollback = result.find((c) => c.dirName === 'rollback')!;
    expect(rollback.content).toBe('Rollback instructions.');
  });

  it('parses frontmatter from command files', async () => {
    const archive = createMockArchive({
      'commands/': '',
      'commands/deploy.md': [
        '---',
        'name: Deploy App',
        'description: Deploys the app to production',
        '---',
        '',
        'Run the deploy script.',
      ].join('\n'),
    });

    const result = await readCommands(archive, baseManifest);

    expect(result).toHaveLength(1);
    expect(result[0].dirName).toBe('deploy');
    expect(result[0].meta.name).toBe('Deploy App');
    expect(result[0].meta.description).toBe('Deploys the app to production');
    expect(result[0].content).toBe('Run the deploy script.');
  });

  it('derives dirName from filename without .md extension', async () => {
    const archive = createMockArchive({
      'commands/': '',
      'commands/my-complex-command.md': 'Content.',
    });

    const result = await readCommands(archive, baseManifest);

    expect(result).toHaveLength(1);
    expect(result[0].dirName).toBe('my-complex-command');
  });

  it('returns empty array when no command files exist', async () => {
    const archive = createMockArchive({
      'skills/my-skill/SKILL.md': '',
    });

    const result = await readCommands(archive, baseManifest);

    expect(result).toEqual([]);
  });
});
