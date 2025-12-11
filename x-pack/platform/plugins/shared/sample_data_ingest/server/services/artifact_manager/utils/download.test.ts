/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createWriteStream } from '@kbn/fs';
import { open } from 'fs/promises';
import { pipeline } from 'stream/promises';
import fetch from 'node-fetch';
import { download } from './download';

jest.mock('@kbn/fs', () => ({
  createWriteStream: jest.fn(() => ({
    on: jest.fn((event, callback) => {
      if (event === 'finish') {
        callback();
      }
    }),
    pipe: jest.fn(),
  })),
  getSafePath: jest
    .fn()
    .mockReturnValue({ fullPath: 'artifacts/file.zip', alias: 'disk:artifacts/file.zip' }),
}));

jest.mock('fs/promises', () => ({
  open: jest.fn(),
}));

jest.mock('node-fetch', () => jest.fn());

jest.mock('stream/promises', () => ({
  pipeline: jest.fn(),
}));

describe('download', () => {
  const mockFileUrl = 'http://example.com/file.zip';
  const mockFilePath = 'artifacts/file.zip';
  const mockMimeType = 'application/zip';

  const mockFileHandle = {
    read: jest.fn(),
    close: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (open as jest.Mock).mockResolvedValue(mockFileHandle);
    mockFileHandle.read.mockResolvedValue({
      bytesRead: 8,
    });
    mockFileHandle.close.mockResolvedValue(undefined);
  });

  it('should download and validate a ZIP file successfully', async () => {
    const mockResponseBody = {
      pipe: jest.fn(),
      on: jest.fn(),
    };

    (fetch as unknown as jest.Mock).mockResolvedValue({
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue('application/zip'),
      },
      body: mockResponseBody,
    });

    // Mock ZIP file signature (PK)
    const zipBuffer = Buffer.alloc(8);
    zipBuffer[0] = 0x50;
    zipBuffer[1] = 0x4b;
    mockFileHandle.read.mockResolvedValue({
      bytesRead: 8,
    });
    mockFileHandle.read.mockImplementation((buffer) => {
      buffer.set(zipBuffer);
      return Promise.resolve({ bytesRead: 8 });
    });

    await download(mockFileUrl, mockFilePath, mockMimeType);

    expect(fetch).toHaveBeenCalledWith(mockFileUrl, { signal: undefined });
    expect(createWriteStream).toHaveBeenCalledWith(mockFilePath);
    expect(pipeline).toHaveBeenCalledWith(mockResponseBody, expect.anything());
    expect(open).toHaveBeenCalledWith(mockFilePath, 'r');
    expect(mockFileHandle.close).toHaveBeenCalled();
  });

  it('should throw error for invalid MIME type', async () => {
    (fetch as unknown as jest.Mock).mockResolvedValue({
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue('text/plain'),
      },
      body: {},
    });

    await expect(download(mockFileUrl, mockFilePath, mockMimeType)).rejects.toThrow(
      'Invalid MIME type: text/plain. Expected: application/zip'
    );
  });

  it('should throw error for invalid file signature', async () => {
    const mockResponseBody = {
      pipe: jest.fn(),
      on: jest.fn(),
    };

    (fetch as unknown as jest.Mock).mockResolvedValue({
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue('application/zip'),
      },
      body: mockResponseBody,
    });

    // Mock invalid file signature
    const invalidBuffer = Buffer.alloc(8);
    invalidBuffer[0] = 0x00;
    invalidBuffer[1] = 0x00;
    mockFileHandle.read.mockImplementation((buffer) => {
      buffer.set(invalidBuffer);
      return Promise.resolve({ bytesRead: 8 });
    });

    await expect(download(mockFileUrl, mockFilePath, mockMimeType)).rejects.toThrow(
      'File content does not match ZIP format'
    );
  });

  it('should handle HTTP errors', async () => {
    (fetch as unknown as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    await expect(download(mockFileUrl, mockFilePath, mockMimeType)).rejects.toThrow(
      'Failed to download file: 404 Not Found'
    );
  });

  it('should handle missing Content-Type header', async () => {
    (fetch as unknown as jest.Mock).mockResolvedValue({
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue(null),
      },
      body: {},
    });

    await expect(download(mockFileUrl, mockFilePath, mockMimeType)).rejects.toThrow(
      'Missing Content-Type header'
    );
  });

  it('should handle path traversal attempts', async () => {
    const maliciousPaths = ['../../../etc/passwd', 'file/../../../config', './test/../../secret'];

    const realKbnFs = jest.requireActual<typeof import('@kbn/fs')>('@kbn/fs');

    (createWriteStream as jest.Mock).mockImplementation(realKbnFs.createWriteStream);

    for (const maliciousPath of maliciousPaths) {
      try {
        await download(mockFileUrl, maliciousPath, mockMimeType);
      } catch (err) {
        expect(err.message).toContain('Path traversal detected');
      }
    }

    expect(fetch as unknown as jest.Mock).not.toHaveBeenCalled();
  });
});
