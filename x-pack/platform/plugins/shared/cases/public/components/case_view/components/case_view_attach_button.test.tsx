/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';

import { CaseViewAttachButton } from './case_view_attach_button';
import { buildCasesPermissions, renderWithTestingProviders } from '../../../common/mock';

jest.mock('../../attachments/file/upload_file_modal', () => ({
  UploadFileModal: () => <div data-test-subj="upload-file-modal-mock" />,
}));

describe('CaseViewAttachButton', () => {
  // EuiPopover panel has `pointer-events: none` in jsdom; bypass the check so
  // userEvent can click the menu items rendered inside it.
  const user = userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the attach button', async () => {
    renderWithTestingProviders(<CaseViewAttachButton caseId="case-1" />);
    expect(await screen.findByTestId('case-view-attach-button')).toBeInTheDocument();
  });

  it('opens the popover with the upload-file menu item', async () => {
    renderWithTestingProviders(<CaseViewAttachButton caseId="case-1" />);
    await user.click(await screen.findByTestId('case-view-attach-button'));
    expect(await screen.findByTestId('case-view-attach-menu-file')).toBeInTheDocument();
  });

  it('opens the upload file modal when File is selected', async () => {
    renderWithTestingProviders(<CaseViewAttachButton caseId="case-1" />);
    await user.click(await screen.findByTestId('case-view-attach-button'));
    await user.click(await screen.findByTestId('case-view-attach-menu-file'));
    await screen.findByTestId('upload-file-modal-mock');
  });

  it('does not render without `createComment` permission', () => {
    renderWithTestingProviders(<CaseViewAttachButton caseId="case-1" />, {
      wrapperProps: {
        permissions: buildCasesPermissions({ createComment: false }),
      },
    });
    expect(screen.queryByTestId('case-view-attach-button')).not.toBeInTheDocument();
  });
});
