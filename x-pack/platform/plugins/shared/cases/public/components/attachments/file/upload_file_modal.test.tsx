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
      onFilesSelected,
      meta,
    }: Required<
      Pick<FileUploadProps, 'kind' | 'onDone' | 'onError' | 'onFilesSelected' | 'meta'>
    >) => (
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
        <button
          data-test-subj="testOnFilesSelectedDuplicate"
          type="button"
          onClick={() =>
            onFilesSelected?.([
              { name: `${basicFileMock.name}.${basicFileMock.extension ?? ''}` } as File,
            ])
          }
        >
          {'test'}
        </button>
        <button
          data-test-subj="testOnFilesSelectedNew"
          type="button"
          onClick={() => onFilesSelected?.([{ name: 'some-brand-new-file.txt' } as File])}
        >
          {'test'}
        </button>
        <button
          data-test-subj="testOnFilesCleared"
          type="button"
          onClick={() => onFilesSelected?.([])}
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
  const dangerMock = jest.fn();

  useToastsMock.mockImplementation(() => ({
    addSuccess: successMock,
    addError: errorMock,
    addDanger: dangerMock,
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

  it('renders the upload hint with max size and supported formats', async () => {
    renderWithTestingProviders(<UploadFileModal caseId="foobar" onClose={onCloseMock} />);

    const hint = await screen.findByTestId('cases-files-upload-hint');
    expect(hint).toHaveTextContent(/Maximum file size:/);
    expect(hint).toHaveTextContent(/Supported formats:/);
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

  it('shows a categorized notice for unsupported file types instead of the raw mime message', async () => {
    renderWithTestingProviders(<UploadFileModal caseId="foobar" onClose={onCloseMock} />);

    await userEvent.click(await screen.findByTestId('testOnMimeError'));

    // rich (bolded) content is rendered via a mount point, so assert on the
    // title and that a danger toast was raised rather than the error toast
    expect(dangerMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Unsupported file type', text: expect.anything() })
    );
    expect(errorMock).not.toHaveBeenCalled();
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

  describe('duplicate file warning', () => {
    // `basicFileMock.extension` is optional on the type; narrow it here so the
    // fixture, the mock trigger, and the assertion all share the same value.
    const duplicateExtension = basicFileMock.extension ?? '';
    const duplicateFullName = `${basicFileMock.name}.${duplicateExtension}`;
    // The picked file matches basicFileMock (name + extension), so listing it
    // as already attached triggers the inline callout without any client fetch.
    const duplicate = [{ name: basicFileMock.name, extension: duplicateExtension }];

    it('does not show the warning by default', async () => {
      renderWithTestingProviders(
        <UploadFileModal caseId="foobar" existingFiles={duplicate} onClose={onCloseMock} />
      );

      await screen.findByTestId('cases-files-add-modal');
      expect(screen.queryByTestId('cases-files-duplicate-warning')).not.toBeInTheDocument();
    });

    it('shows the warning when the picked file matches one already on the case', async () => {
      renderWithTestingProviders(
        <UploadFileModal caseId="foobar" existingFiles={duplicate} onClose={onCloseMock} />
      );

      await userEvent.click(await screen.findByTestId('testOnFilesSelectedDuplicate'));

      const warning = await screen.findByTestId('cases-files-duplicate-warning');
      expect(warning).toHaveTextContent(`A file named "${duplicateFullName}" is already attached`);
    });

    it('does not show the warning when the picked file does not match', async () => {
      renderWithTestingProviders(
        <UploadFileModal caseId="foobar" existingFiles={duplicate} onClose={onCloseMock} />
      );

      await userEvent.click(await screen.findByTestId('testOnFilesSelectedNew'));

      expect(screen.queryByTestId('cases-files-duplicate-warning')).not.toBeInTheDocument();
    });

    it('clears the warning when the picker selection is cleared', async () => {
      renderWithTestingProviders(
        <UploadFileModal caseId="foobar" existingFiles={duplicate} onClose={onCloseMock} />
      );

      await userEvent.click(await screen.findByTestId('testOnFilesSelectedDuplicate'));
      await screen.findByTestId('cases-files-duplicate-warning');

      await userEvent.click(screen.getByTestId('testOnFilesCleared'));

      await waitFor(() =>
        expect(screen.queryByTestId('cases-files-duplicate-warning')).not.toBeInTheDocument()
      );
    });

    it('still attaches when the user proceeds through the warning', async () => {
      renderWithTestingProviders(
        <UploadFileModal caseId="foobar" existingFiles={duplicate} onClose={onCloseMock} />
      );

      await userEvent.click(await screen.findByTestId('testOnFilesSelectedDuplicate'));
      await screen.findByTestId('cases-files-duplicate-warning');

      await userEvent.click(screen.getByTestId('testOnDone'));

      await waitFor(() => expect(createAttachmentsMock).toHaveBeenCalled());
      await waitFor(() => expect(onCloseMock).toHaveBeenCalled());
    });
  });
});
