/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable, PassThrough } from 'stream';

const mockGetSafePath = jest.fn();
const mockCreateWriteStream = jest.fn();
const mockDeleteFile = jest.fn();

jest.mock('@kbn/fs', () => ({
  getSafePath: (...args: unknown[]) => mockGetSafePath(...args),
  createWriteStream: (...args: unknown[]) => mockCreateWriteStream(...args),
  deleteFile: (...args: unknown[]) => mockDeleteFile(...args),
}));

jest.mock('crypto', () => ({
  randomUUID: () => 'test-uuid-1234',
}));

import { saveUploadedFile } from './save_uploaded_file';

describe('saveUploadedFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSafePath.mockReturnValue({ fullPath: '/data/agent_builder/tmp/test-uuid-1234.zip' });
    mockDeleteFile.mockResolvedValue(undefined);
  });

  it('saves the stream to a temporary file and returns the path', async () => {
    const writeStream = new PassThrough();
    mockCreateWriteStream.mockReturnValue(writeStream);

    const input = Readable.from(Buffer.from('zip content'));

    const result = await saveUploadedFile(input);

    expect(mockGetSafePath).toHaveBeenCalledWith('tmp/test-uuid-1234.zip', 'agent_builder');
    expect(mockCreateWriteStream).toHaveBeenCalledWith('tmp/test-uuid-1234.zip', 'agent_builder');
    expect(result.filePath).toBe('/data/agent_builder/tmp/test-uuid-1234.zip');
    expect(typeof result.cleanup).toBe('function');
  });

  it('cleanup deletes the temporary file', async () => {
    const writeStream = new PassThrough();
    mockCreateWriteStream.mockReturnValue(writeStream);

    const input = Readable.from(Buffer.from('zip content'));

    const { cleanup } = await saveUploadedFile(input);
    await cleanup();

    expect(mockDeleteFile).toHaveBeenCalledWith('tmp/test-uuid-1234.zip', {
      volume: 'agent_builder',
    });
  });

  it('cleanup swallows errors from deleteFile', async () => {
    const writeStream = new PassThrough();
    mockCreateWriteStream.mockReturnValue(writeStream);
    mockDeleteFile.mockRejectedValue(new Error('delete failed'));

    const input = Readable.from(Buffer.from('zip content'));

    const { cleanup } = await saveUploadedFile(input);

    await expect(cleanup()).resolves.toBeUndefined();
  });

  it('deletes the temp file when the pipeline fails', async () => {
    const writeStream = new PassThrough();
    writeStream.destroy(new Error('write error'));
    mockCreateWriteStream.mockReturnValue(writeStream);

    const input = Readable.from(Buffer.from('zip content'));

    await expect(saveUploadedFile(input)).rejects.toThrow();

    expect(mockDeleteFile).toHaveBeenCalledWith('tmp/test-uuid-1234.zip', {
      volume: 'agent_builder',
    });
  });
});
