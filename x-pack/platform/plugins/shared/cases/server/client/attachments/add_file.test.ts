/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import type { File } from '@kbn/files-plugin/common';

import type { Case } from '../../../common';
import { MAX_USER_ACTIONS_PER_CASE } from '../../../common/constants';
import { createUserActionServiceMock } from '../../services/mocks';
import { createCasesClientMock, createCasesClientMockArgs } from '../mocks';
import { addFile } from './add_file';
import { buildAttachmentRequestFromFileJSON } from '../utils';

jest.mock('../utils');

const buildAttachmentRequestFromFileJSONMock = buildAttachmentRequestFromFileJSON as jest.Mock;

describe('addFile', () => {
  const caseId = 'test-case';
  const file = new Readable();
  file.push('theFile');
  file.push(null);
  const owner = 'cases';

  const clientArgs = createCasesClientMockArgs();
  const casesClient = createCasesClientMock();
  const userActionService = createUserActionServiceMock();

  clientArgs.services.userActionService = userActionService;

  beforeEach(() => {
    jest.clearAllMocks();
    userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue({});
    casesClient.cases.get.mockResolvedValue({ id: caseId, owner } as unknown as Case);
  });

  it('throws an error if the filename is missing', async () => {
    await expect(
      addFile(
        // @ts-expect-error
        { caseId, fileRequest: { file, mimeType: 'text/plain' } },
        clientArgs,
        casesClient
      )
    ).rejects.toThrow(`Invalid value "undefined" supplied to "filename"`);
  });

  it('throws an error if the mimeType is not part of the allowed mime types', async () => {
    await expect(
      addFile({ caseId, file, filename: 'foobar', mimeType: 'foo/bar' }, clientArgs, casesClient)
    ).rejects.toThrow('The mime type field value foo/bar is not allowed.');
  });

  it(`throws an error when the case user actions become > ${MAX_USER_ACTIONS_PER_CASE}`, async () => {
    userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue({
      [caseId]: MAX_USER_ACTIONS_PER_CASE,
    });

    await expect(
      addFile({ caseId, file, filename: 'foobar', mimeType: 'text/plain' }, clientArgs, casesClient)
    ).rejects.toThrow(
      `The case with id ${caseId} has reached the limit of ${MAX_USER_ACTIONS_PER_CASE} user actions.`
    );
  });

  it('calls fileService.delete when an error is thrown after the file was created', async () => {
    const id = 'file-id';

    clientArgs.fileService.create.mockResolvedValue({
      id,
      uploadContent: jest.fn(),
      toJSON: () => {
        throw new Error(); // ensures an error is thrown after file creation
      },
    } as unknown as File);

    await expect(
      addFile(
        {
          caseId,
          file,
          filename: 'foobar',
          mimeType: 'text/plain',
        },
        clientArgs,
        casesClient
      )
    ).rejects.toThrowError();
    expect(clientArgs.fileService.delete).toHaveBeenCalledWith({ id });
  });

  it('calls buildAttachmentRequestFromFileJSON with the correct params', async () => {
    const fileMetadata = {
      id: 'file-id',
      created: 'created',
      extension: 'jpg',
      mimeType: 'image/jpeg',
      name: 'foobar',
    };

    clientArgs.fileService.create.mockResolvedValue({
      id: fileMetadata.id,
      uploadContent: jest.fn(),
      toJSON: () => fileMetadata,
    } as unknown as File);

    buildAttachmentRequestFromFileJSONMock.mockImplementation(() => {
      throw new Error(); // ensures the test finishes early
    });

    await expect(
      addFile(
        {
          caseId,
          file,
          filename: fileMetadata.name,
          mimeType: fileMetadata.mimeType,
        },
        clientArgs,
        casesClient
      )
    ).rejects.toThrowError();
    expect(buildAttachmentRequestFromFileJSONMock).toHaveBeenCalledWith({ owner, fileMetadata });
  });
});
