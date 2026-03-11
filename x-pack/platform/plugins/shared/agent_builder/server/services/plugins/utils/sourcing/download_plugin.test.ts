/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable, PassThrough } from 'stream';
import { pipeline } from 'stream/promises';
import type { ParsedPluginArchive } from '@kbn/agent-builder-common';
import type { ZipArchive } from '../archive';

const mockOpenZipArchive = jest.fn();
jest.mock('../archive', () => ({
  openZipArchive: (...args: unknown[]) => mockOpenZipArchive(...args),
}));

const mockParsePluginZipFile = jest.fn();
jest.mock('../parsing', () => ({
  parsePluginZipFile: (...args: unknown[]) => mockParsePluginZipFile(...args),
  PluginArchiveError: class PluginArchiveError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'PluginArchiveError';
    }
  },
}));

import { parsePluginFromFile, createSizeLimitTransform } from './download_plugin';

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
        mcp_servers: [],
        output_styles: [],
        lsp_servers: [],
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

describe('createSizeLimitTransform', () => {
  it('passes through data under the limit', async () => {
    const transform = createSizeLimitTransform(100, 'http://example.com');
    const input = Readable.from([Buffer.alloc(50), Buffer.alloc(30)]);
    const output = new PassThrough();

    const chunks: Buffer[] = [];
    output.on('data', (chunk: Buffer) => chunks.push(chunk));

    await pipeline(input, transform, output);

    expect(Buffer.concat(chunks).length).toBe(80);
  });

  it('rejects when data exceeds the limit', async () => {
    const transform = createSizeLimitTransform(100, 'http://example.com/big.zip');
    const input = Readable.from([Buffer.alloc(60), Buffer.alloc(60)]);
    const output = new PassThrough();

    await expect(pipeline(input, transform, output)).rejects.toThrow(
      /exceeds the maximum allowed size/
    );
  });

  it('rejects when a single chunk exceeds the limit', async () => {
    const transform = createSizeLimitTransform(50, 'http://example.com/huge.zip');
    const input = Readable.from([Buffer.alloc(100)]);
    const output = new PassThrough();

    await expect(pipeline(input, transform, output)).rejects.toThrow(
      /exceeds the maximum allowed size of 50 bytes/
    );
  });
});
