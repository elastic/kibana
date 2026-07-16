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
import {
  buildCasesPermissions,
  mockedTestProvidersOwner,
  renderWithTestingProviders,
} from '../../../common/mock';
import { AddFile } from './add_file';
import { useToasts } from '../../../common/lib/kibana';

import { useCreateAttachments } from '../../../containers/use_create_attachments';
import { basicCaseId, basicFileMock } from '../../../containers/mock';

jest.mock('../../../containers/api');
jest.mock('../../../containers/use_create_attachments');
jest.mock('../../../common/lib/kibana');

const useToastsMock = useToasts as jest.Mock;
const useCreateAttachmentsMock = useCreateAttachments as jest.Mock;

const mockedExternalReferenceId = 'externalReferenceId';
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
          onClick={() =>
            onDone([{ id: mockedExternalReferenceId, kind, fileJSON: { ...basicFileMock, meta } }])
          }
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
        <button
          data-test-subj="testOnMimeError"
          type="button"
          onClick={() => {
            const mimeError = new Error('File type "application/x-foo" is not supported.');
            (mimeError as { code?: string }).code = 'mimeTypeNotSupported';
            onError(mimeError);
          }}
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

describe('AddFile', () => {
  const successMock = jest.fn();
  const errorMock = jest.fn();
  const dangerMock = jest.fn();

  useToastsMock.mockImplementation(() => {
    return {
      addSuccess: successMock,
      addError: errorMock,
      addDanger: dangerMock,
    };
  });

  const createAttachmentsMock = jest.fn();

  useCreateAttachmentsMock.mockReturnValue({
    isLoading: false,
    mutateAsync: createAttachmentsMock,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    renderWithTestingProviders(<AddFile caseId={'foobar'} />);

    expect(await screen.findByTestId('cases-files-add')).toBeInTheDocument();
  });

  it('AddFile is not rendered if user has no createComment permission', async () => {
    renderWithTestingProviders(<AddFile caseId={'foobar'} />, {
      wrapperProps: {
        permissions: buildCasesPermissions({ createComment: false }),
      },
    });

    expect(screen.queryByTestId('cases-files-add')).not.toBeInTheDocument();
  });

  it('clicking button renders modal', async () => {
    renderWithTestingProviders(<AddFile caseId={'foobar'} />);

    await userEvent.click(await screen.findByTestId('cases-files-add'));

    expect(await screen.findByTestId('cases-files-add-modal')).toBeInTheDocument();
  });

  it('renders the upload hint with max size and supported formats', async () => {
    renderWithTestingProviders(<AddFile caseId={'foobar'} />);

    await userEvent.click(await screen.findByTestId('cases-files-add'));

    const hint = await screen.findByTestId('cases-files-upload-hint');
    expect(hint).toHaveTextContent(/Maximum file size:/);
    expect(hint).toHaveTextContent(/Supported formats:/);
  });

  it('createAttachments called with right parameters', async () => {
    renderWithTestingProviders(<AddFile caseId={'foobar'} />);

    await userEvent.click(await screen.findByTestId('cases-files-add'));

    expect(await screen.findByTestId('cases-files-add-modal')).toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('testOnDone'));

    await waitFor(() =>
      expect(createAttachmentsMock).toBeCalledWith({
        caseId: 'foobar',
        caseOwner: mockedTestProvidersOwner[0],
        attachments: [
          {
            externalReferenceAttachmentTypeId: '.files',
            externalReferenceId: mockedExternalReferenceId,
            externalReferenceMetadata: {
              files: [
                {
                  created: '2020-02-19T23:06:33.798Z',
                  extension: 'png',
                  mimeType: 'image/png',
                  name: 'my-super-cool-screenshot',
                },
              ],
            },
            externalReferenceStorage: { soType: 'file', type: 'savedObject' },
            type: 'externalReference',
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

  it('failed upload displays error toast', async () => {
    renderWithTestingProviders(<AddFile caseId={'foobar'} />);

    await userEvent.click(await screen.findByTestId('cases-files-add'));

    expect(await screen.findByTestId('cases-files-add-modal')).toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('testOnError'));

    expect(errorMock).toHaveBeenCalledWith(
      { name: 'upload error name', message: 'upload error message' },
      {
        title: 'Failed to upload file',
      }
    );
  });

  it('shows a categorized notice for unsupported file types instead of the raw mime message', async () => {
    renderWithTestingProviders(<AddFile caseId={'foobar'} />);

    await userEvent.click(await screen.findByTestId('cases-files-add'));

    expect(await screen.findByTestId('cases-files-add-modal')).toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('testOnMimeError'));

    // rich (bolded) content is rendered via a mount point, so assert on the
    // title and that a danger toast was raised rather than the error toast
    expect(dangerMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Unsupported file type', text: expect.anything() })
    );
    expect(errorMock).not.toHaveBeenCalled();
  });

  it('correct metadata is passed to FileUpload component', async () => {
    const caseId = 'foobar';

    renderWithTestingProviders(<AddFile caseId={caseId} />);

    await userEvent.click(await screen.findByTestId('cases-files-add'));

    expect(await screen.findByTestId('cases-files-add-modal')).toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('testMetadata'));

    await waitFor(() =>
      expect(validateMetadata).toHaveBeenCalledWith({
        caseIds: [caseId],
        owner: [mockedTestProvidersOwner[0]],
      })
    );
  });

  it('deleteFileAttachments is called correctly if createAttachments fails', async () => {
    const spyOnDeleteFileAttachments = jest.spyOn(api, 'deleteFileAttachments');

    createAttachmentsMock.mockImplementation(() => {
      throw new Error();
    });

    renderWithTestingProviders(<AddFile caseId={basicCaseId} />);

    await userEvent.click(await screen.findByTestId('cases-files-add'));

    expect(await screen.findByTestId('cases-files-add-modal')).toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('testOnDone'));

    expect(spyOnDeleteFileAttachments).toHaveBeenCalledWith({
      caseId: basicCaseId,
      fileIds: [mockedExternalReferenceId],
    });

    createAttachmentsMock.mockRestore();
  });
});
