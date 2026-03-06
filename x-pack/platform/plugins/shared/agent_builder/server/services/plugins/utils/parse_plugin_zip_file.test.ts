/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parsePluginZipFile, PluginArchiveError } from './parse_plugin_zip_file';
import type { ZipArchive } from './open_zip_archive';

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

describe('parsePluginZipFile', () => {
  it('parses a valid plugin with manifest and skills', async () => {
    const archive = createMockArchive({
      '.claude-plugin/plugin.json': JSON.stringify({
        name: 'test-plugin',
        version: '1.0.0',
        description: 'A test plugin',
      }),
      'skills/': '',
      'skills/my-skill/': '',
      'skills/my-skill/SKILL.md': [
        '---',
        'name: my-skill',
        'description: Does things',
        'allowed-tools: Read, Grep',
        '---',
        '',
        'Skill instructions here.',
      ].join('\n'),
      'skills/my-skill/reference.md': 'Reference content here.',
    });

    const result = await parsePluginZipFile(archive);

    expect(result.manifest).toEqual({
      name: 'test-plugin',
      version: '1.0.0',
      description: 'A test plugin',
    });
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0].meta).toEqual({
      name: 'my-skill',
      description: 'Does things',
      allowedTools: ['Read', 'Grep'],
    });
    expect(result.skills[0].content).toBe('Skill instructions here.');
    expect(result.skills[0].referencedFiles).toEqual([
      { relativePath: 'reference.md', content: 'Reference content here.' },
    ]);
  });

  it('throws when manifest is missing', async () => {
    const archive = createMockArchive({
      'skills/my-skill/SKILL.md': 'Some content',
    });

    await expect(parsePluginZipFile(archive)).rejects.toThrow(PluginArchiveError);
    await expect(parsePluginZipFile(archive)).rejects.toThrow(/manifest not found/);
  });

  it('reads manifest from root plugin.json as fallback', async () => {
    const archive = createMockArchive({
      'plugin.json': JSON.stringify({
        name: 'root-manifest-plugin',
        version: '1.0.0',
      }),
      'skills/my-skill/SKILL.md': 'Skill content.',
    });

    const result = await parsePluginZipFile(archive);

    expect(result.manifest.name).toBe('root-manifest-plugin');
    expect(result.manifest.version).toBe('1.0.0');
    expect(result.skills).toHaveLength(1);
  });

  it('prefers .claude-plugin/plugin.json over root plugin.json', async () => {
    const archive = createMockArchive({
      '.claude-plugin/plugin.json': JSON.stringify({ name: 'from-claude-plugin-dir' }),
      'plugin.json': JSON.stringify({ name: 'from-root' }),
    });

    const result = await parsePluginZipFile(archive);

    expect(result.manifest.name).toBe('from-claude-plugin-dir');
  });

  it('throws when manifest JSON is invalid', async () => {
    const archive = createMockArchive({
      '.claude-plugin/plugin.json': '{ invalid json }',
    });

    await expect(parsePluginZipFile(archive)).rejects.toThrow(PluginArchiveError);
    await expect(parsePluginZipFile(archive)).rejects.toThrow(/Invalid JSON/);
  });

  it('throws when manifest is missing the "name" field', async () => {
    const archive = createMockArchive({
      '.claude-plugin/plugin.json': JSON.stringify({
        version: '1.0.0',
        description: 'No name',
      }),
    });

    await expect(parsePluginZipFile(archive)).rejects.toThrow(PluginArchiveError);
    await expect(parsePluginZipFile(archive)).rejects.toThrow(/Invalid plugin manifest.*"name"/);
  });

  it('throws when manifest "name" is empty', async () => {
    const archive = createMockArchive({
      '.claude-plugin/plugin.json': JSON.stringify({ name: '  ' }),
    });

    await expect(parsePluginZipFile(archive)).rejects.toThrow(
      /Invalid plugin manifest.*"name".*must not be empty/
    );
  });

  it('detects unmanaged assets', async () => {
    const archive = createMockArchive({
      '.claude-plugin/plugin.json': JSON.stringify({ name: 'test-plugin' }),
      'commands/': '',
      'commands/deploy.md': 'Deploy command',
      'commands/status.md': 'Status command',
      'agents/': '',
      'agents/reviewer.md': 'Reviewer agent',
      'hooks/': '',
      'hooks/hooks.json': '{}',
      '.mcp.json': '{}',
      '.lsp.json': '{}',
    });

    const result = await parsePluginZipFile(archive);

    expect(result.skills).toHaveLength(0);
    expect(result.unmanagedAssets.commands).toEqual(
      expect.arrayContaining(['commands/deploy.md', 'commands/status.md'])
    );
    expect(result.unmanagedAssets.agents).toEqual(['agents/reviewer.md']);
    expect(result.unmanagedAssets.hooks).toEqual(['hooks/hooks.json']);
    expect(result.unmanagedAssets.mcpServers).toEqual(['.mcp.json']);
    expect(result.unmanagedAssets.lspServers).toEqual(['.lsp.json']);
  });

  it('reads skills from custom paths defined in manifest', async () => {
    const archive = createMockArchive({
      '.claude-plugin/plugin.json': JSON.stringify({
        name: 'custom-paths',
        skills: './custom/skills/',
      }),
      'custom/skills/': '',
      'custom/skills/custom-skill/': '',
      'custom/skills/custom-skill/SKILL.md': [
        '---',
        'name: custom-skill',
        '---',
        '',
        'Custom skill content.',
      ].join('\n'),
    });

    const result = await parsePluginZipFile(archive);

    expect(result.skills).toHaveLength(1);
    expect(result.skills[0].meta.name).toBe('custom-skill');
    expect(result.skills[0].content).toBe('Custom skill content.');
  });

  it('reads skills from both default and custom paths', async () => {
    const archive = createMockArchive({
      '.claude-plugin/plugin.json': JSON.stringify({
        name: 'multi-paths',
        skills: './extra/skills/',
      }),
      'skills/default-skill/SKILL.md': 'Default skill content.',
      'extra/skills/extra-skill/SKILL.md': 'Extra skill content.',
    });

    const result = await parsePluginZipFile(archive);

    expect(result.skills).toHaveLength(2);
    const skillNames = result.skills.map((s) => s.content);
    expect(skillNames).toContain('Default skill content.');
    expect(skillNames).toContain('Extra skill content.');
  });

  it('handles skills without frontmatter', async () => {
    const archive = createMockArchive({
      '.claude-plugin/plugin.json': JSON.stringify({ name: 'test' }),
      'skills/simple/SKILL.md': 'Just instructions, no frontmatter.',
    });

    const result = await parsePluginZipFile(archive);

    expect(result.skills).toHaveLength(1);
    expect(result.skills[0].meta).toEqual({});
    expect(result.skills[0].content).toBe('Just instructions, no frontmatter.');
  });

  it('validates manifest field types', async () => {
    const archive = createMockArchive({
      '.claude-plugin/plugin.json': JSON.stringify({
        name: 'test',
        version: 123,
      }),
    });

    await expect(parsePluginZipFile(archive)).rejects.toThrow(
      /Invalid plugin manifest.*"version".*Expected string/
    );
  });

  it('validates manifest keywords as array of strings', async () => {
    const archive = createMockArchive({
      '.claude-plugin/plugin.json': JSON.stringify({
        name: 'test',
        keywords: ['valid', 42],
      }),
    });

    await expect(parsePluginZipFile(archive)).rejects.toThrow(
      /Invalid plugin manifest.*"keywords\.1".*Expected string/
    );
  });

  it('validates manifest path fields', async () => {
    const archive = createMockArchive({
      '.claude-plugin/plugin.json': JSON.stringify({
        name: 'test',
        skills: 42,
      }),
    });

    await expect(parsePluginZipFile(archive)).rejects.toThrow(/Invalid plugin manifest.*"skills"/);
  });

  it('rejects unknown manifest fields', async () => {
    const archive = createMockArchive({
      '.claude-plugin/plugin.json': JSON.stringify({
        name: 'test',
        unknownField: 'value',
      }),
    });

    await expect(parsePluginZipFile(archive)).rejects.toThrow(
      /Invalid plugin manifest.*Unrecognized key/
    );
  });

  it('parses a complete manifest with all metadata fields', async () => {
    const archive = createMockArchive({
      '.claude-plugin/plugin.json': JSON.stringify({
        name: 'full-plugin',
        version: '2.0.0',
        description: 'Full plugin',
        author: { name: 'Test Author', email: 'test@example.com', url: 'https://example.com' },
        homepage: 'https://example.com/plugin',
        repository: 'https://github.com/test/plugin',
        license: 'MIT',
        keywords: ['test', 'plugin'],
      }),
    });

    const result = await parsePluginZipFile(archive);

    expect(result.manifest).toEqual({
      name: 'full-plugin',
      version: '2.0.0',
      description: 'Full plugin',
      author: { name: 'Test Author', email: 'test@example.com', url: 'https://example.com' },
      homepage: 'https://example.com/plugin',
      repository: 'https://github.com/test/plugin',
      license: 'MIT',
      keywords: ['test', 'plugin'],
    });
  });

  it('detects unmanaged assets from custom manifest paths', async () => {
    const archive = createMockArchive({
      '.claude-plugin/plugin.json': JSON.stringify({
        name: 'test',
        commands: ['./custom/cmd.md'],
        mcpServers: './mcp-config.json',
      }),
      'custom/cmd.md': 'custom command',
      'mcp-config.json': '{}',
    });

    const result = await parsePluginZipFile(archive);

    expect(result.unmanagedAssets.commands).toContain('custom/cmd.md');
    expect(result.unmanagedAssets.mcpServers).toContain('mcp-config.json');
  });

  it('collects multiple referenced files for a skill', async () => {
    const archive = createMockArchive({
      '.claude-plugin/plugin.json': JSON.stringify({ name: 'test' }),
      'skills/rich-skill/SKILL.md': 'Skill content.',
      'skills/rich-skill/reference.md': 'Reference docs.',
      'skills/rich-skill/examples/sample.md': 'Example output.',
      'skills/rich-skill/scripts/validate.sh': '#!/bin/bash\necho ok',
    });

    const result = await parsePluginZipFile(archive);

    expect(result.skills).toHaveLength(1);
    expect(result.skills[0].referencedFiles).toHaveLength(3);
    const paths = result.skills[0].referencedFiles.map((f) => f.relativePath);
    expect(paths).toContain('reference.md');
    expect(paths).toContain('examples/sample.md');
    expect(paths).toContain('scripts/validate.sh');
  });
});
