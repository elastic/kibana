/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnmanagedPluginAssets } from '@kbn/agent-builder-common';
import type { PluginUnmanagedAssetsProperties } from './storage';
import { unmanagedAssetsToEs, unmanagedAssetsFromEs } from './storage';

describe('unmanagedAssetsToEs', () => {
  it('converts camelCase fields to snake_case', () => {
    const input: UnmanagedPluginAssets = {
      commands: ['commands/cmd1.md'],
      agents: ['agents/'],
      hooks: ['hooks.json'],
      mcpServers: ['mcp-config.json'],
      outputStyles: ['styles/custom.md'],
      lspServers: ['.lsp.json'],
    };

    expect(unmanagedAssetsToEs(input)).toEqual({
      commands: ['commands/cmd1.md'],
      agents: ['agents/'],
      hooks: ['hooks.json'],
      mcp_servers: ['mcp-config.json'],
      output_styles: ['styles/custom.md'],
      lsp_servers: ['.lsp.json'],
    });
  });

  it('handles empty arrays', () => {
    const input: UnmanagedPluginAssets = {
      commands: [],
      agents: [],
      hooks: [],
      mcpServers: [],
      outputStyles: [],
      lspServers: [],
    };

    expect(unmanagedAssetsToEs(input)).toEqual({
      commands: [],
      agents: [],
      hooks: [],
      mcp_servers: [],
      output_styles: [],
      lsp_servers: [],
    });
  });
});

describe('unmanagedAssetsFromEs', () => {
  it('converts snake_case fields to camelCase', () => {
    const input: PluginUnmanagedAssetsProperties = {
      commands: ['commands/cmd1.md'],
      agents: ['agents/'],
      hooks: ['hooks.json'],
      mcp_servers: ['mcp-config.json'],
      output_styles: ['styles/custom.md'],
      lsp_servers: ['.lsp.json'],
    };

    expect(unmanagedAssetsFromEs(input)).toEqual({
      commands: ['commands/cmd1.md'],
      agents: ['agents/'],
      hooks: ['hooks.json'],
      mcpServers: ['mcp-config.json'],
      outputStyles: ['styles/custom.md'],
      lspServers: ['.lsp.json'],
    });
  });

  it('roundtrips correctly with unmanagedAssetsToEs', () => {
    const original: UnmanagedPluginAssets = {
      commands: ['a.md'],
      agents: ['b/'],
      hooks: ['c.json'],
      mcpServers: ['d.json'],
      outputStyles: ['e/'],
      lspServers: ['f.json'],
    };

    expect(unmanagedAssetsFromEs(unmanagedAssetsToEs(original))).toEqual(original);
  });
});
