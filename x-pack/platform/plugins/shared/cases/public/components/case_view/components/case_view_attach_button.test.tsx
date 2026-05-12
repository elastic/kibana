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
import { KibanaServices } from '../../../common/lib/kibana';
import { renderWithTestingProviders } from '../../../common/mock';

jest.mock('./attach_saved_object_modal', () => ({
  AttachSavedObjectModal: () => <div data-test-subj="attach-saved-object-modal-mock" />,
}));

jest.mock('../../attachments/file/upload_file_modal', () => ({
  UploadFileModal: () => <div data-test-subj="upload-file-modal-mock" />,
}));

const getConfigMock = jest.spyOn(KibanaServices, 'getConfig');
const setAttachmentsEnabled = (enabled: boolean) =>
  getConfigMock.mockReturnValue({ attachments: { enabled } } as ReturnType<
    typeof KibanaServices.getConfig
  >);

describe('CaseViewAttachButton', () => {
  // EuiPopover panel has `pointer-events: none` in jsdom; bypass the check so
  // userEvent can click the menu items rendered inside it.
  const user = userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when the attachments feature flag is disabled', () => {
    setAttachmentsEnabled(false);
    renderWithTestingProviders(
      <CaseViewAttachButton caseId="case-1" caseOwner="securitySolution" />
    );
    expect(screen.queryByTestId('case-view-attach-button')).not.toBeInTheDocument();
  });

  it('renders nothing when the config is missing entirely', () => {
    getConfigMock.mockReturnValue(
      undefined as unknown as ReturnType<typeof KibanaServices.getConfig>
    );
    renderWithTestingProviders(
      <CaseViewAttachButton caseId="case-1" caseOwner="securitySolution" />
    );
    expect(screen.queryByTestId('case-view-attach-button')).not.toBeInTheDocument();
  });

  describe('when the attachments feature flag is enabled', () => {
    beforeEach(() => {
      setAttachmentsEnabled(true);
    });

    it('renders the attach button', async () => {
      renderWithTestingProviders(
        <CaseViewAttachButton caseId="case-1" caseOwner="securitySolution" />
      );
      expect(await screen.findByTestId('case-view-attach-button')).toBeInTheDocument();
    });

    it('opens the popover with file and saved-objects menu items', async () => {
      renderWithTestingProviders(
        <CaseViewAttachButton caseId="case-1" caseOwner="securitySolution" />
      );
      await user.click(await screen.findByTestId('case-view-attach-button'));
      expect(await screen.findByTestId('case-view-attach-menu-file')).toBeInTheDocument();
      expect(screen.getByTestId('case-view-attach-menu-saved-objects')).toBeInTheDocument();
    });

    it('opens the upload file modal when File is selected', async () => {
      renderWithTestingProviders(
        <CaseViewAttachButton caseId="case-1" caseOwner="securitySolution" />
      );
      await user.click(await screen.findByTestId('case-view-attach-button'));
      await user.click(await screen.findByTestId('case-view-attach-menu-file'));
      await screen.findByTestId('upload-file-modal-mock');
      expect(screen.queryByTestId('attach-saved-object-modal-mock')).not.toBeInTheDocument();
    });

    it('opens the attach saved-object modal when Saved objects is selected', async () => {
      renderWithTestingProviders(
        <CaseViewAttachButton caseId="case-1" caseOwner="securitySolution" />
      );
      await user.click(await screen.findByTestId('case-view-attach-button'));
      await user.click(await screen.findByTestId('case-view-attach-menu-saved-objects'));
      await screen.findByTestId('attach-saved-object-modal-mock');
      expect(screen.queryByTestId('upload-file-modal-mock')).not.toBeInTheDocument();
    });
  });
});
