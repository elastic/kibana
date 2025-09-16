/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { saveScreenshot } from './save';
import { FILE_KIND_DELIMITER } from '../types';
import type { BaseFilesClient } from '@kbn/shared-ux-file-types';

jest.mock('./utils', () => ({
  getFileName: jest.fn(() => 'mocked_filename.png'),
}));

function createFilesClientMock(): jest.Mocked<BaseFilesClient> {
  return {
    create: jest.fn(),
    upload: jest.fn(),
    bulkDelete: jest.fn(),
  } as unknown as jest.Mocked<BaseFilesClient>;
}

describe('saveScreenshot', () => {
  const blob = new Blob(['test'], { type: 'image/png' });
  const baseOptions = {
    save: true,
    caseId: 'case-123',
    owner: 'observability',
    appName: 'app',
    pageName: 'page',
    dependencies: { filesClient: undefined },
  };

  it('returns undefined if filesClient is missing', async () => {
    const result = await saveScreenshot('url', blob, { ...baseOptions, dependencies: {} });
    expect(result).toBeUndefined();
  });

  it('calls create and upload and returns upload result', async () => {
    const uploadResult = { ok: true, size: 1234, fileId: 'file-1' };
    const filesClient = {
      ...createFilesClientMock(),
      create: jest.fn().mockResolvedValue({
        file: { id: 'file-1', fileKind: 'kind-1' },
      }),
      upload: jest.fn().mockResolvedValue(uploadResult),
    };
    const options = { ...baseOptions, dependencies: { filesClient } };

    const result = await saveScreenshot('url', blob, options);

    expect(filesClient.create).toHaveBeenCalledWith({
      name: 'mocked_filename.png',
      kind: `observability${FILE_KIND_DELIMITER}`,
      mimeType: 'image/png',
      meta: { caseIds: ['case-123'], owner: 'observability' },
    });
    expect(filesClient.upload).toHaveBeenCalledWith({
      id: 'file-1',
      kind: 'kind-1',
      body: blob,
      contentType: 'image/png',
    });
    expect(result).toStrictEqual(uploadResult);
    expect(filesClient.bulkDelete).not.toHaveBeenCalled();
  });

  it('calls bulkDelete if upload throws', async () => {
    const filesClient = {
      ...createFilesClientMock(),
      create: jest.fn().mockResolvedValue({
        file: { id: 'file-2', fileKind: 'kind-2' },
      }),
      upload: jest.fn().mockRejectedValue(new Error('fail')),
    };
    const options = { ...baseOptions, dependencies: { filesClient } };

    const result = await saveScreenshot('url', blob, options);

    expect(filesClient.upload).toHaveBeenCalled();
    expect(filesClient.bulkDelete).toHaveBeenCalledWith({ ids: ['file-2'] });
    expect(result).toBeUndefined();
  });

  it('does not call upload if result of create file is undefined', async () => {
    const filesClient = {
      ...createFilesClientMock(),
      create: jest.fn().mockResolvedValue(undefined),
    };
    const options = { ...baseOptions, dependencies: { filesClient } };

    const result = await saveScreenshot('url', blob, options);

    expect(filesClient.create).toHaveBeenCalled();
    expect(filesClient.upload).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
});
