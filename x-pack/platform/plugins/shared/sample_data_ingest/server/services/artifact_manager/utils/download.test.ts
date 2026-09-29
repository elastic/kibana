/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { createWriteStream } from '@kbn/fs';
import { open } from 'fs/promises';
import { pipeline } from 'stream/promises';
import { download } from './download';

vi.mock('@kbn/fs', () => {
      const mocked = {
      createWriteStream: vi.fn(() => ({
        on: vi.fn((event, callback) => {
          if (event === 'finish') {
            callback();
          }
        }),
        pipe: vi.fn(),
      })),
      getSafePath: vi
        .fn()
        .mockReturnValue({ fullPath: 'artifacts/file.zip', alias: 'disk:artifacts/file.zip' }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('fs/promises', () => {
      const mocked = {
      open: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('stream/promises', () => {
      const mocked = {
      pipeline: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

// Mock Readable.fromWeb to return the mock body directly since pipeline is already mocked
vi.mock('stream', () => {
  const actual = require('stream');
  return {
    ...actual,
    Readable: {
      ...actual.Readable,
      fromWeb: vi.fn((webStream) => webStream),
    },
  };
});

const fetchMock = vi.spyOn(global, 'fetch');

describe('download', () => {
  const mockFileUrl = 'http://example.com/file.zip';
  const mockFilePath = 'artifacts/file.zip';
  const mockMimeType = 'application/zip';

  const mockFileHandle = {
    read: vi.fn(),
    close: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (open as Mock).mockResolvedValue(mockFileHandle);
    mockFileHandle.read.mockResolvedValue({
      bytesRead: 8,
    });
    mockFileHandle.close.mockResolvedValue(undefined);
  });

  it('should download and validate a ZIP file successfully', async () => {
    const mockResponseBody = {
      pipe: vi.fn(),
      on: vi.fn(),
    };

    fetchMock.mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn().mockReturnValue('application/zip'),
      },
      body: mockResponseBody,
    } as unknown as Response);

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

    expect(fetchMock).toHaveBeenCalledWith(mockFileUrl, { signal: undefined });
    expect(createWriteStream).toHaveBeenCalledWith(mockFilePath);
    expect(pipeline).toHaveBeenCalledWith(mockResponseBody, expect.anything());
    expect(open).toHaveBeenCalledWith(mockFilePath, 'r');
    expect(mockFileHandle.close).toHaveBeenCalled();
  });

  it('should throw error for invalid MIME type', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn().mockReturnValue('text/plain'),
      },
      body: {},
    } as unknown as Response);

    await expect(download(mockFileUrl, mockFilePath, mockMimeType)).rejects.toThrow(
      'Invalid MIME type: text/plain. Expected: application/zip'
    );
  });

  it('should throw error for invalid file signature', async () => {
    const mockResponseBody = {
      pipe: vi.fn(),
      on: vi.fn(),
    };

    fetchMock.mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn().mockReturnValue('application/zip'),
      },
      body: mockResponseBody,
    } as unknown as Response);

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
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as unknown as Response);

    await expect(download(mockFileUrl, mockFilePath, mockMimeType)).rejects.toThrow(
      'Failed to download file: 404 Not Found'
    );
  });

  it('should handle missing Content-Type header', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn().mockReturnValue(null),
      },
      body: {},
    } as unknown as Response);

    await expect(download(mockFileUrl, mockFilePath, mockMimeType)).rejects.toThrow(
      'Missing Content-Type header'
    );
  });

  it('should handle path traversal attempts', async () => {
    const maliciousPaths = ['../../../etc/passwd', 'file/../../../config', './test/../../secret'];

    const realKbnFs = (await vi.importActual<typeof import('@kbn/fs')>('@kbn/fs'));

    (createWriteStream as Mock).mockImplementation(realKbnFs.createWriteStream);

    for (const maliciousPath of maliciousPaths) {
      try {
        await download(mockFileUrl, maliciousPath, mockMimeType);
      } catch (err) {
        expect(err.message).toContain('Path traversal detected');
      }
    }

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
