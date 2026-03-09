/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedPluginArchive } from '@kbn/agent-builder-common';
import type { PluginProperties } from './storage';
import type { PluginDocument } from './types';
import {
  fromEs,
  createRequestToEs,
  updateRequestToEs,
  parsedArchiveToCreateRequest,
  toPluginDefinition,
} from './converters';

const createPluginProperties = (overrides?: Partial<PluginProperties>): PluginProperties => ({
  id: 'plugin-1',
  name: 'test-plugin',
  version: '1.0.0',
  space: 'default',
  description: 'A test plugin',
  manifest: {
    author: { name: 'Test Author', email: 'test@example.com' },
    homepage: 'https://example.com',
    repository: 'https://github.com/test/plugin',
    license: 'MIT',
    keywords: ['test', 'plugin'],
  },
  source_url: 'https://github.com/test/plugin/archive/main.zip',
  skill_ids: ['skill-1', 'skill-2'],
  unmanaged_assets: {
    commands: ['commands/cmd1.md'],
    agents: [],
    hooks: [],
    mcp_servers: ['mcp-config.json'],
    output_styles: [],
    lsp_servers: [],
  },
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
  ...overrides,
});

const createPluginDocument = (overrides?: Partial<PluginProperties>): PluginDocument => ({
  _id: 'doc-id-1',
  _source: createPluginProperties(overrides),
});

describe('plugin converters', () => {
  describe('fromEs', () => {
    it('converts a full ES document to a PersistedPluginDefinition', () => {
      const result = fromEs(createPluginDocument());

      expect(result).toEqual({
        id: 'plugin-1',
        name: 'test-plugin',
        version: '1.0.0',
        description: 'A test plugin',
        manifest: {
          author: { name: 'Test Author', email: 'test@example.com' },
          homepage: 'https://example.com',
          repository: 'https://github.com/test/plugin',
          license: 'MIT',
          keywords: ['test', 'plugin'],
        },
        source_url: 'https://github.com/test/plugin/archive/main.zip',
        skill_ids: ['skill-1', 'skill-2'],
        unmanaged_assets: {
          commands: ['commands/cmd1.md'],
          agents: [],
          hooks: [],
          mcp_servers: ['mcp-config.json'],
          output_styles: [],
          lsp_servers: [],
        },
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      });
    });

    it('defaults skill_ids to empty array when missing', () => {
      const doc = createPluginDocument();
      (doc._source as any).skill_ids = undefined;

      const result = fromEs(doc);
      expect(result.skill_ids).toEqual([]);
    });

    it('throws when _source is missing', () => {
      const doc: PluginDocument = { _id: 'doc-id-1', _source: undefined };
      expect(() => fromEs(doc)).toThrow('No source found on plugin document');
    });

    it('excludes the space field from the result', () => {
      const result = fromEs(createPluginDocument());
      expect(result).not.toHaveProperty('space');
    });
  });

  describe('createRequestToEs', () => {
    const fixedDate = new Date('2025-06-15T12:00:00.000Z');

    it('converts a create request to PluginProperties', () => {
      const result = createRequestToEs({
        id: 'new-id',
        createRequest: {
          name: 'my-plugin',
          version: '2.0.0',
          description: 'My plugin',
          manifest: {
            author: { name: 'Author' },
            license: 'Apache-2.0',
          },
          source_url: 'https://example.com/plugin.zip',
          skill_ids: ['s1'],
          unmanaged_assets: {
            commands: [],
            agents: [],
            hooks: [],
            mcp_servers: [],
            output_styles: [],
            lsp_servers: [],
          },
        },
        space: 'my-space',
        creationDate: fixedDate,
      });

      expect(result).toEqual({
        id: 'new-id',
        name: 'my-plugin',
        version: '2.0.0',
        space: 'my-space',
        description: 'My plugin',
        manifest: {
          author: { name: 'Author' },
          license: 'Apache-2.0',
        },
        source_url: 'https://example.com/plugin.zip',
        skill_ids: ['s1'],
        unmanaged_assets: {
          commands: [],
          agents: [],
          hooks: [],
          mcp_servers: [],
          output_styles: [],
          lsp_servers: [],
        },
        created_at: '2025-06-15T12:00:00.000Z',
        updated_at: '2025-06-15T12:00:00.000Z',
      });
    });

    it('defaults skill_ids to empty array when not provided', () => {
      const result = createRequestToEs({
        id: 'new-id',
        createRequest: {
          name: 'my-plugin',
          version: '1.0.0',
          description: '',
          manifest: {},
          unmanaged_assets: {
            commands: [],
            agents: [],
            hooks: [],
            mcp_servers: [],
            output_styles: [],
            lsp_servers: [],
          },
        },
        space: 'default',
        creationDate: fixedDate,
      });

      expect(result.skill_ids).toEqual([]);
    });

    it('passes unmanaged_assets through directly', () => {
      const result = createRequestToEs({
        id: 'new-id',
        createRequest: {
          name: 'p',
          version: '1.0.0',
          description: '',
          manifest: {},
          unmanaged_assets: {
            commands: ['cmd.md'],
            agents: ['agent/'],
            hooks: ['hooks.json'],
            mcp_servers: ['mcp.json'],
            output_styles: ['styles/'],
            lsp_servers: ['lsp.json'],
          },
        },
        space: 'default',
        creationDate: fixedDate,
      });

      expect(result.unmanaged_assets).toEqual({
        commands: ['cmd.md'],
        agents: ['agent/'],
        hooks: ['hooks.json'],
        mcp_servers: ['mcp.json'],
        output_styles: ['styles/'],
        lsp_servers: ['lsp.json'],
      });
    });
  });

  describe('parsedArchiveToCreateRequest', () => {
    const baseArchive: ParsedPluginArchive = {
      manifest: {
        name: 'my-plugin',
        version: '2.0.0',
        description: 'A parsed plugin',
        author: { name: 'Author' },
        homepage: 'https://example.com',
        repository: 'https://github.com/test/plugin',
        license: 'MIT',
        keywords: ['test'],
        skills: [],
      },
      skills: [],
      unmanagedAssets: {
        commands: ['cmd.md'],
        agents: [],
        hooks: [],
        mcp_servers: ['mcp.json'],
        output_styles: [],
        lsp_servers: [],
      },
    };

    it('converts a full parsed archive to a PluginCreateRequest', () => {
      const result = parsedArchiveToCreateRequest({
        parsedArchive: baseArchive,
        sourceUrl: 'https://github.com/test/plugin/archive/main.zip',
        skillIds: [],
      });

      expect(result).toEqual({
        name: 'my-plugin',
        version: '2.0.0',
        description: 'A parsed plugin',
        manifest: {
          author: { name: 'Author' },
          homepage: 'https://example.com',
          repository: 'https://github.com/test/plugin',
          license: 'MIT',
          keywords: ['test'],
        },
        source_url: 'https://github.com/test/plugin/archive/main.zip',
        skill_ids: [],
        unmanaged_assets: {
          commands: ['cmd.md'],
          agents: [],
          hooks: [],
          mcp_servers: ['mcp.json'],
          output_styles: [],
          lsp_servers: [],
        },
      });
    });

    it('defaults version to 0.0.0 when not present', () => {
      const archive: ParsedPluginArchive = {
        ...baseArchive,
        manifest: { ...baseArchive.manifest, version: undefined },
      };
      const result = parsedArchiveToCreateRequest({
        parsedArchive: archive,
        sourceUrl: 'https://example.com/plugin.zip',
        skillIds: [],
      });
      expect(result.version).toBe('0.0.0');
    });

    it('defaults description to empty string when not present', () => {
      const archive: ParsedPluginArchive = {
        ...baseArchive,
        manifest: { ...baseArchive.manifest, description: undefined },
      };
      const result = parsedArchiveToCreateRequest({
        parsedArchive: archive,
        sourceUrl: 'https://example.com/plugin.zip',
        skillIds: [],
      });
      expect(result.description).toBe('');
    });

    it('uses the provided skillIds', () => {
      const result = parsedArchiveToCreateRequest({
        parsedArchive: baseArchive,
        sourceUrl: 'https://example.com/plugin.zip',
        skillIds: ['my-plugin-skill-a', 'my-plugin-skill-b'],
      });
      expect(result.skill_ids).toEqual(['my-plugin-skill-a', 'my-plugin-skill-b']);
    });

    it('uses nameOverride instead of manifest name when provided', () => {
      const result = parsedArchiveToCreateRequest({
        parsedArchive: baseArchive,
        sourceUrl: 'https://example.com/plugin.zip',
        skillIds: [],
        nameOverride: 'custom-name',
      });
      expect(result.name).toBe('custom-name');
    });

    it('falls back to manifest name when nameOverride is not provided', () => {
      const result = parsedArchiveToCreateRequest({
        parsedArchive: baseArchive,
        sourceUrl: 'https://example.com/plugin.zip',
        skillIds: [],
      });
      expect(result.name).toBe('my-plugin');
    });
  });

  describe('updateRequestToEs', () => {
    const fixedDate = new Date('2025-07-01T00:00:00.000Z');
    let current: PluginProperties;

    beforeEach(() => {
      current = createPluginProperties();
    });

    it('updates only the provided fields', () => {
      const result = updateRequestToEs({
        current,
        update: { version: '2.0.0' },
        updateDate: fixedDate,
      });

      expect(result.version).toBe('2.0.0');
      expect(result.name).toBe('test-plugin');
      expect(result.description).toBe('A test plugin');
      expect(result.updated_at).toBe('2025-07-01T00:00:00.000Z');
    });

    it('merges manifest fields with existing values', () => {
      const result = updateRequestToEs({
        current,
        update: { manifest: { license: 'Apache-2.0' } },
        updateDate: fixedDate,
      });

      expect(result.manifest).toEqual({
        author: { name: 'Test Author', email: 'test@example.com' },
        homepage: 'https://example.com',
        repository: 'https://github.com/test/plugin',
        license: 'Apache-2.0',
        keywords: ['test', 'plugin'],
      });
    });

    it('updates skill_ids', () => {
      const result = updateRequestToEs({
        current,
        update: { skill_ids: ['new-skill'] },
        updateDate: fixedDate,
      });

      expect(result.skill_ids).toEqual(['new-skill']);
    });

    it('updates unmanaged_assets', () => {
      const result = updateRequestToEs({
        current,
        update: {
          unmanaged_assets: {
            commands: [],
            agents: [],
            hooks: [],
            mcp_servers: ['new-mcp.json'],
            output_styles: [],
            lsp_servers: [],
          },
        },
        updateDate: fixedDate,
      });

      expect(result.unmanaged_assets).toEqual({
        commands: [],
        agents: [],
        hooks: [],
        mcp_servers: ['new-mcp.json'],
        output_styles: [],
        lsp_servers: [],
      });
    });

    it('does not modify fields that are not in the update', () => {
      const result = updateRequestToEs({
        current,
        update: {},
        updateDate: fixedDate,
      });

      expect(result.version).toBe(current.version);
      expect(result.description).toBe(current.description);
      expect(result.manifest).toEqual(current.manifest);
      expect(result.skill_ids).toBe(current.skill_ids);
      expect(result.unmanaged_assets).toBe(current.unmanaged_assets);
      expect(result.updated_at).toBe('2025-07-01T00:00:00.000Z');
    });
  });

  describe('toPluginDefinition', () => {
    it('converts a PersistedPluginDefinition to a PluginDefinition', () => {
      const persisted = fromEs(createPluginDocument());
      const result = toPluginDefinition(persisted);

      expect(result).toEqual({
        id: 'plugin-1',
        name: 'test-plugin',
        version: '1.0.0',
        description: 'A test plugin',
        manifest: {
          author: { name: 'Test Author', email: 'test@example.com' },
          homepage: 'https://example.com',
          repository: 'https://github.com/test/plugin',
          license: 'MIT',
          keywords: ['test', 'plugin'],
        },
        source_url: 'https://github.com/test/plugin/archive/main.zip',
        skill_ids: ['skill-1', 'skill-2'],
        unmanaged_assets: {
          commands: ['commands/cmd1.md'],
          agents: [],
          hooks: [],
          mcp_servers: ['mcp-config.json'],
          output_styles: [],
          lsp_servers: [],
        },
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      });
    });

    it('handles optional source_url being undefined', () => {
      const persisted = fromEs(createPluginDocument({ source_url: undefined }));
      const result = toPluginDefinition(persisted);

      expect(result.source_url).toBeUndefined();
    });
  });
});
