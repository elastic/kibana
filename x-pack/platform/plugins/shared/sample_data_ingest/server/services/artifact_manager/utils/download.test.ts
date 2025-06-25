/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { pipeline } from 'stream/promises';
import fetch from 'node-fetch';
import { download } from './download';

jest.mock('fs', () => ({
  createWriteStream: jest.fn(() => ({
    on: jest.fn((event, callback) => {
      if (event === 'finish') {
        callback();
      }
    }),
    pipe: jest.fn(),
  })),
}));

jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
}));

jest.mock('node-fetch', () => jest.fn());

jest.mock('stream/promises', () => ({
  pipeline: jest.fn(),
}));

describe('downloadToDisk', () => {
  const mockFileUrl = 'http://example.com/file.txt';
  const mockFilePath = '/path/to/file.txt';
  const mockDirPath = '/path/to';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create the directory if it does not exist', async () => {
    (fetch as unknown as jest.Mock).mockResolvedValue({
      body: {
        pipe: jest.fn(),
        on: jest.fn(),
      },
    });

    await download(mockFileUrl, mockFilePath);

    expect(mkdir).toHaveBeenCalledWith(mockDirPath, { recursive: true });
  });

  it('should download a file from a remote URL', async () => {
    const mockResponseBody = {
      pipe: jest.fn(),
      on: jest.fn((event, callback) => {}),
    };

    (fetch as unknown as jest.Mock).mockResolvedValue({
      body: mockResponseBody,
    });

    await download(mockFileUrl, mockFilePath);

    expect(fetch).toHaveBeenCalledWith(mockFileUrl);
    expect(createWriteStream).toHaveBeenCalledWith(mockFilePath);
    expect(pipeline).toHaveBeenCalledWith(mockResponseBody, expect.anything());
  });

  it('should handle errors during the download process', async () => {
    const mockError = new Error('Download failed');
    (fetch as unknown as jest.Mock).mockRejectedValue(mockError);

    await expect(download(mockFileUrl, mockFilePath)).rejects.toThrow('Download failed');
  });
});
