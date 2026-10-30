/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { fireEvent, screen } from '@testing-library/react';

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

  it('renders the trigger button', () => {
    renderWithTestingProviders(<AddFile caseId="foobar" />);

    expect(screen.getByTestId('cases-files-add')).toBeInTheDocument();
  });

  it('does not render when the user lacks createComment permission', () => {
    renderWithTestingProviders(<AddFile caseId="foobar" />, {
      wrapperProps: {
        permissions: buildCasesPermissions({ createComment: false }),
      },
    });

    expect(screen.queryByTestId('cases-files-add')).not.toBeInTheDocument();
  });

  it('opens the upload modal when the trigger is clicked', () => {
    renderWithTestingProviders(<AddFile caseId="foobar" />);

    fireEvent.click(screen.getByTestId('cases-files-add'));

    expect(screen.getByTestId('upload-file-modal-mock')).toBeInTheDocument();
  });

  it('closes the modal when `onClose` is invoked', () => {
    renderWithTestingProviders(<AddFile caseId="foobar" />);

    fireEvent.click(screen.getByTestId('cases-files-add'));
    expect(screen.getByTestId('upload-file-modal-mock')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('upload-file-modal-mock-close'));
    expect(screen.queryByTestId('upload-file-modal-mock')).not.toBeInTheDocument();
  });
});
