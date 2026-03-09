/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedPluginArchive } from '@kbn/agent-builder-common';
import type { ZipArchive } from './open_zip_archive';

const mockOpenZipArchive = jest.fn();
jest.mock('./open_zip_archive', () => ({
  openZipArchive: (...args: unknown[]) => mockOpenZipArchive(...args),
}));

const mockParsePluginZipFile = jest.fn();
jest.mock('./parse_plugin_zip_file', () => ({
  parsePluginZipFile: (...args: unknown[]) => mockParsePluginZipFile(...args),
  PluginArchiveError: class extends Error {},
}));

import { parsePluginFromFile } from './parse_plugin_from_url';

describe('parsePluginFromFile', () => {
  let mockArchive: jest.Mocked<ZipArchive>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockArchive = {
      hasEntry: jest.fn().mockReturnValue(false),
      getEntryPaths: jest.fn().mockReturnValue([]),
      getEntryContent: jest.fn(),
      close: jest.fn(),
    };
    mockOpenZipArchive.mockResolvedValue(mockArchive);
  });

  it('opens the zip file and parses it', async () => {
    const expectedResult: ParsedPluginArchive = {
      manifest: { name: 'test-plugin' },
      skills: [],
      unmanagedAssets: {
        commands: [],
        agents: [],
        hooks: [],
        mcpServers: [],
        outputStyles: [],
        lspServers: [],
      },
    };

    mockParsePluginZipFile.mockResolvedValue(expectedResult);

    const result = await parsePluginFromFile('/path/to/plugin.zip');

    expect(mockOpenZipArchive).toHaveBeenCalledWith('/path/to/plugin.zip');
    expect(mockParsePluginZipFile).toHaveBeenCalledWith(mockArchive);
    expect(mockArchive.close).toHaveBeenCalled();
    expect(result).toBe(expectedResult);
  });

  it('closes the archive even when parsing fails', async () => {
    mockParsePluginZipFile.mockRejectedValue(new Error('parse error'));

    await expect(parsePluginFromFile('/path/to/bad.zip')).rejects.toThrow('parse error');

    expect(mockArchive.close).toHaveBeenCalled();
  });

  it('closes the archive even when opening succeeds but parsing throws synchronously', async () => {
    mockParsePluginZipFile.mockImplementation(() => {
      throw new Error('sync error');
    });

    await expect(parsePluginFromFile('/path/to/file.zip')).rejects.toThrow('sync error');

    expect(mockArchive.close).toHaveBeenCalled();
  });
});
