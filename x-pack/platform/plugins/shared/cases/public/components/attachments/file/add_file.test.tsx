/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { buildCasesPermissions, renderWithTestingProviders } from '../../../common/mock';
import { AddFile } from './add_file';

jest.mock('./upload_file_modal', () => ({
  UploadFileModal: ({ onClose }: { onClose: () => void }) => (
    <div data-test-subj="upload-file-modal-mock">
      <button data-test-subj="upload-file-modal-mock-close" type="button" onClick={onClose}>
        {'close'}
      </button>
    </div>
  ),
}));

describe('AddFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the trigger button', async () => {
    renderWithTestingProviders(<AddFile caseId="foobar" />);

    expect(await screen.findByTestId('cases-files-add')).toBeInTheDocument();
  });

  it('does not render when the user lacks createComment permission', () => {
    renderWithTestingProviders(<AddFile caseId="foobar" />, {
      wrapperProps: {
        permissions: buildCasesPermissions({ createComment: false }),
      },
    });

    expect(screen.queryByTestId('cases-files-add')).not.toBeInTheDocument();
  });

  it('opens the upload modal when the trigger is clicked', async () => {
    renderWithTestingProviders(<AddFile caseId="foobar" />);

    await userEvent.click(await screen.findByTestId('cases-files-add'));

    expect(await screen.findByTestId('upload-file-modal-mock')).toBeInTheDocument();
  });

  it('closes the modal when `onClose` is invoked', async () => {
    renderWithTestingProviders(<AddFile caseId="foobar" />);

    await userEvent.click(await screen.findByTestId('cases-files-add'));
    expect(await screen.findByTestId('upload-file-modal-mock')).toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('upload-file-modal-mock-close'));
    expect(screen.queryByTestId('upload-file-modal-mock')).not.toBeInTheDocument();
  });
});
