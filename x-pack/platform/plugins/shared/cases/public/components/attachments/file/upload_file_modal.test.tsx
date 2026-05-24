/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { FileUploadProps } from '@kbn/shared-ux-file-upload';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import * as api from '../../../containers/api';
import { mockedTestProvidersOwner, renderWithTestingProviders } from '../../../common/mock';
import { UploadFileModal } from './upload_file_modal';
import { useToasts } from '../../../common/lib/kibana';

import { useCreateAttachments } from '../../../containers/use_create_attachments';
import { basicCaseId, basicFileMock } from '../../../containers/mock';

jest.mock('../../../containers/api');
jest.mock('../../../containers/use_create_attachments');
jest.mock('../../../common/lib/kibana');

const useToastsMock = useToasts as jest.Mock;
const useCreateAttachmentsMock = useCreateAttachments as jest.Mock;

const mockedFileId = 'fileAttachmentId';
const validateMetadata = jest.fn();
const mockFileUpload = jest
  .fn()
  .mockImplementation(
    ({
      kind,
      onDone,
      onError,
      meta,
    }: Required<Pick<FileUploadProps, 'kind' | 'onDone' | 'onError' | 'meta'>>) => (
      <>
        <button
          data-test-subj="testOnDone"
          type="button"
          onClick={() => onDone([{ id: mockedFileId, kind, fileJSON: { ...basicFileMock, meta } }])}
        >
          {'test'}
        </button>
        <button
          data-test-subj="testOnError"
          type="button"
          onClick={() => onError({ name: 'upload error name', message: 'upload error message' })}
        >
          {'test'}
        </button>
        <button data-test-subj="testMetadata" type="button" onClick={() => validateMetadata(meta)}>
          {'test'}
        </button>
      </>
    )
  );

jest.mock('@kbn/shared-ux-file-upload', () => {
  const original = jest.requireActual('@kbn/shared-ux-file-upload');
  return {
    ...original,
    FileUpload: (props: unknown) => mockFileUpload(props),
  };
});

describe('UploadFileModal', () => {
  const successMock = jest.fn();
  const errorMock = jest.fn();

  useToastsMock.mockImplementation(() => ({
    addSuccess: successMock,
    addError: errorMock,
  }));

  const createAttachmentsMock = jest.fn();
  const onCloseMock = jest.fn();

  useCreateAttachmentsMock.mockReturnValue({
    isLoading: false,
    mutateAsync: createAttachmentsMock,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the modal', async () => {
    renderWithTestingProviders(<UploadFileModal caseId="foobar" onClose={onCloseMock} />);

    expect(await screen.findByTestId('cases-files-add-modal')).toBeInTheDocument();
  });

  it('createAttachments called with the unified `file` attachment shape', async () => {
    renderWithTestingProviders(<UploadFileModal caseId="foobar" onClose={onCloseMock} />);

    await userEvent.click(await screen.findByTestId('testOnDone'));

    await waitFor(() =>
      expect(createAttachmentsMock).toBeCalledWith({
        caseId: 'foobar',
        caseOwner: mockedTestProvidersOwner[0],
        attachments: [
          {
            type: 'file',
            attachmentId: mockedFileId,
            metadata: {
              soType: 'file',
              files: [
                {
                  created: '2020-02-19T23:06:33.798Z',
                  extension: 'png',
                  mimeType: 'image/png',
                  name: 'my-super-cool-screenshot',
                },
              ],
            },
          },
        ],
      })
    );

    await waitFor(() =>
      expect(successMock).toHaveBeenCalledWith({
        className: 'eui-textBreakWord',
        title: `File ${basicFileMock.name} uploaded successfully`,
      })
    );
  });

  it('closes the modal after a successful upload', async () => {
    renderWithTestingProviders(<UploadFileModal caseId="foobar" onClose={onCloseMock} />);

    await userEvent.click(await screen.findByTestId('testOnDone'));

    await waitFor(() => expect(onCloseMock).toHaveBeenCalled());
  });

  it('failed upload displays an error toast', async () => {
    renderWithTestingProviders(<UploadFileModal caseId="foobar" onClose={onCloseMock} />);

    await userEvent.click(await screen.findByTestId('testOnError'));

    expect(errorMock).toHaveBeenCalledWith(
      { name: 'upload error name', message: 'upload error message' },
      { title: 'Failed to upload file' }
    );
  });

  it('forwards `caseId` and the owner from context to FileUpload `meta`', async () => {
    const caseId = 'foobar';

    renderWithTestingProviders(<UploadFileModal caseId={caseId} onClose={onCloseMock} />);

    await userEvent.click(await screen.findByTestId('testMetadata'));

    await waitFor(() =>
      expect(validateMetadata).toHaveBeenCalledWith({
        caseIds: [caseId],
        owner: [mockedTestProvidersOwner[0]],
      })
    );
  });

  it('rolls back the orphan file SO when createAttachments fails', async () => {
    const spyOnDeleteFileAttachments = jest.spyOn(api, 'deleteFileAttachments');

    createAttachmentsMock.mockImplementation(() => {
      throw new Error();
    });

    renderWithTestingProviders(<UploadFileModal caseId={basicCaseId} onClose={onCloseMock} />);

    await userEvent.click(await screen.findByTestId('testOnDone'));

    expect(spyOnDeleteFileAttachments).toHaveBeenCalledWith({
      caseId: basicCaseId,
      fileIds: [mockedFileId],
    });

    createAttachmentsMock.mockRestore();
  });
});
