/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  buildCasesPermissions,
  mockedTestProvidersOwner,
  renderWithTestingProviders,
} from '../../common/mock';
import { constructFileKindIdByOwner } from '../../../common/files';

import { basicCaseId, basicFileMock } from '../../containers/mock';
import { FileActionsPopoverButton } from './file_actions_popover_button';
import { useDeleteFileAttachment } from '../../containers/use_delete_file_attachment';
import { createMockFilesClient } from '@kbn/shared-ux-file-mocks';

jest.mock('../../containers/use_delete_file_attachment');

const useDeleteFileAttachmentMock = useDeleteFileAttachment as jest.Mock;

// Failing: See https://github.com/elastic/kibana/issues/207257
describe('FileActionsPopoverButton', () => {
  const mutate = jest.fn();

  useDeleteFileAttachmentMock.mockReturnValue({ isLoading: false, mutate });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders file actions popover button correctly', async () => {
    renderWithTestingProviders(
      <FileActionsPopoverButton caseId={basicCaseId} theFile={basicFileMock} />
    );

    expect(
      await screen.findByTestId(`cases-files-actions-popover-button-${basicFileMock.id}`)
    ).toBeInTheDocument();
  });

  it('clicking the button opens the popover', async () => {
    renderWithTestingProviders(
      <FileActionsPopoverButton caseId={basicCaseId} theFile={basicFileMock} />
    );

    await userEvent.click(
      await screen.findByTestId(`cases-files-actions-popover-button-${basicFileMock.id}`)
    );

    expect(
      await screen.findByTestId(`cases-files-popover-${basicFileMock.id}`)
    ).toBeInTheDocument();
    expect(await screen.findByTestId('cases-files-delete-button')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-files-download-button')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-files-copy-hash-button')).toBeInTheDocument();
  });

  it('does not render the copy hash button if the file has no hashes', async () => {
    renderWithTestingProviders(
      <FileActionsPopoverButton caseId={basicCaseId} theFile={{ ...basicFileMock, hash: {} }} />
    );

    await userEvent.click(
      await screen.findByTestId(`cases-files-actions-popover-button-${basicFileMock.id}`)
    );

    expect(
      await screen.findByTestId(`cases-files-popover-${basicFileMock.id}`)
    ).toBeInTheDocument();

    expect(screen.queryByTestId('cases-files-copy-hash-button')).not.toBeInTheDocument();
  });

  it('only renders menu items for the enabled hashes', async () => {
    renderWithTestingProviders(
      <FileActionsPopoverButton
        caseId={basicCaseId}
        theFile={{ ...basicFileMock, hash: { sha1: 'sha1' } }}
      />
    );

    const popoverButton = await screen.findByTestId(
      `cases-files-actions-popover-button-${basicFileMock.id}`
    );

    expect(popoverButton).toBeInTheDocument();
    await userEvent.click(popoverButton);

    expect(
      await screen.findByTestId(`cases-files-popover-${basicFileMock.id}`)
    ).toBeInTheDocument();

    const copyFileHashButton = await screen.findByTestId('cases-files-copy-hash-button');

    expect(copyFileHashButton).toBeInTheDocument();

    await userEvent.click(copyFileHashButton);

    expect(await screen.findByTestId(`cases-files-copy-sha1-hash-button`)).toBeInTheDocument();
    expect(screen.queryByTestId('cases-files-copy-md5-hash-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cases-files-copy-sha256-hash-button')).not.toBeInTheDocument();
  });

  it('clicking the copy file hash button rerenders the popover correctly', async () => {
    renderWithTestingProviders(
      <FileActionsPopoverButton caseId={basicCaseId} theFile={basicFileMock} />
    );

    const popoverButton = await screen.findByTestId(
      `cases-files-actions-popover-button-${basicFileMock.id}`
    );

    expect(popoverButton).toBeInTheDocument();
    await userEvent.click(popoverButton);

    expect(
      await screen.findByTestId(`cases-files-popover-${basicFileMock.id}`)
    ).toBeInTheDocument();

    const copyFileHashButton = await screen.findByTestId('cases-files-copy-hash-button');

    expect(copyFileHashButton).toBeInTheDocument();

    await userEvent.click(copyFileHashButton);

    expect(await screen.findByTestId('cases-files-copy-md5-hash-button')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-files-copy-sha1-hash-button')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-files-copy-sha256-hash-button')).toBeInTheDocument();

    expect(
      (
        await within(await screen.findByTestId('cases-files-popover-context-menu')).findAllByRole(
          'button'
        )
      ).length
    ).toBe(7);
  });

  describe('copy file hashes', () => {
    const originalClipboard = global.window.navigator.clipboard;

    beforeEach(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: jest.fn().mockImplementation(() => Promise.resolve()),
        },
        writable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
      });
    });

    it('clicking copy md5 file hash copies the hash to the clipboard', async () => {
      renderWithTestingProviders(
        <FileActionsPopoverButton caseId={basicCaseId} theFile={basicFileMock} />
      );

      await userEvent.click(
        await screen.findByTestId(`cases-files-actions-popover-button-${basicFileMock.id}`)
      );

      await userEvent.click(await screen.findByTestId('cases-files-copy-hash-button'), {
        pointerEventsCheck: 0,
      });

      await userEvent.click(await screen.findByTestId('cases-files-copy-md5-hash-button'), {
        pointerEventsCheck: 0,
      });

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(basicFileMock.hash?.md5);
      });
    });

    it('clicking copy SHA1 file hash copies the hash to the clipboard', async () => {
      renderWithTestingProviders(
        <FileActionsPopoverButton caseId={basicCaseId} theFile={basicFileMock} />
      );

      await userEvent.click(
        await screen.findByTestId(`cases-files-actions-popover-button-${basicFileMock.id}`)
      );

      await userEvent.click(await screen.findByTestId('cases-files-copy-hash-button'), {
        pointerEventsCheck: 0,
      });

      await userEvent.click(await screen.findByTestId('cases-files-copy-sha1-hash-button'), {
        pointerEventsCheck: 0,
      });

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(basicFileMock.hash?.sha1);
      });
    });

    it('clicking copy SHA256 file hash copies the hash to the clipboard', async () => {
      renderWithTestingProviders(
        <FileActionsPopoverButton caseId={basicCaseId} theFile={basicFileMock} />
      );

      await userEvent.click(
        await screen.findByTestId(`cases-files-actions-popover-button-${basicFileMock.id}`)
      );

      await userEvent.click(await screen.findByTestId('cases-files-copy-hash-button'), {
        pointerEventsCheck: 0,
      });

      await userEvent.click(await screen.findByTestId('cases-files-copy-sha256-hash-button'), {
        pointerEventsCheck: 0,
      });

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(basicFileMock.hash?.sha256);
      });
    });
  });

  describe('delete button', () => {
    it('clicking delete button opens the confirmation modal', async () => {
      renderWithTestingProviders(
        <FileActionsPopoverButton caseId={basicCaseId} theFile={basicFileMock} />
      );

      await userEvent.click(
        await screen.findByTestId(`cases-files-actions-popover-button-${basicFileMock.id}`)
      );

      await userEvent.click(await screen.findByTestId('cases-files-delete-button'), {
        pointerEventsCheck: 0,
      });

      expect(await screen.findByTestId('property-actions-confirm-modal')).toBeInTheDocument();
    });

    it('clicking delete button in the confirmation modal calls deleteFileAttachment with proper params', async () => {
      renderWithTestingProviders(
        <FileActionsPopoverButton caseId={basicCaseId} theFile={basicFileMock} />
      );

      await userEvent.click(
        await screen.findByTestId(`cases-files-actions-popover-button-${basicFileMock.id}`)
      );

      await userEvent.click(await screen.findByTestId('cases-files-delete-button'), {
        pointerEventsCheck: 0,
      });

      expect(await screen.findByTestId('property-actions-confirm-modal')).toBeInTheDocument();

      await userEvent.click(await screen.findByTestId('confirmModalConfirmButton'));

      await waitFor(() => {
        expect(mutate).toHaveBeenCalledTimes(1);
      });

      expect(mutate).toHaveBeenCalledWith({
        caseId: basicCaseId,
        fileId: basicFileMock.id,
      });
    });

    it('delete button is not rendered if user has no delete permission', async () => {
      renderWithTestingProviders(
        <FileActionsPopoverButton caseId={basicCaseId} theFile={basicFileMock} />,
        {
          wrapperProps: {
            permissions: buildCasesPermissions({ delete: false }),
          },
        }
      );

      await userEvent.click(
        await screen.findByTestId(`cases-files-actions-popover-button-${basicFileMock.id}`)
      );

      expect(screen.queryByTestId('cases-files-delete-button')).not.toBeInTheDocument();
    });
  });

  describe('download button', () => {
    it('renders download button with correct href', async () => {
      const filesClient = createMockFilesClient();

      renderWithTestingProviders(
        <FileActionsPopoverButton caseId={basicCaseId} theFile={basicFileMock} />,
        { wrapperProps: { filesClient } }
      );

      await userEvent.click(
        await screen.findByTestId(`cases-files-actions-popover-button-${basicFileMock.id}`)
      );

      expect(await screen.findByTestId('cases-files-download-button')).toBeInTheDocument();

      await waitFor(() => {
        expect(filesClient.getDownloadHref).toBeCalled();
      });

      expect(filesClient.getDownloadHref).toHaveBeenCalledWith({
        fileKind: constructFileKindIdByOwner(mockedTestProvidersOwner[0]),
        id: basicFileMock.id,
      });
    });
  });
});
