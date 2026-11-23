/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiThemeComputed } from '@elastic/eui';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { FILE_SO_TYPE } from '@kbn/files-plugin/common/constants';

import { AttachmentActionType } from '../../../client/attachment_framework/types';
import { basicCase, basicFileMock } from '../../../containers/mock';
import { getFileAttachmentType } from '.';
import { FILE_ATTACHMENT_TYPE } from '../../../../common/constants';
import {
  allCasesPermissions,
  buildCasesPermissions,
  renderWithTestingProviders,
} from '../../../common/mock';
import type { FileViewProps } from '.';

describe('getFileType', () => {
  const fileType = getFileAttachmentType();

  // Minimal slice of EuiThemeComputed; required by the broad rowContext type.
  const euiTheme = {} as unknown as EuiThemeComputed<{}>;

  it('creates the attachment type correctly', () => {
    expect(fileType.getIcon({} as FileViewProps)).toBe('document');
    expect(fileType.getLabel()).toBe('Files');
    expect(fileType).toStrictEqual({
      id: FILE_ATTACHMENT_TYPE,
      getIcon: expect.any(Function),
      getLabel: expect.any(Function),
      getCreationActivity: expect.any(Function),
      getRemovalActivity: expect.any(Function),
      getAttachmentList: expect.any(Function),
      schema: expect.any(Object),
      workflowSchema: false,
    });
  });

  describe('getCreationActivity', () => {
    const validFileEntry = {
      name: basicFileMock.name,
      extension: basicFileMock.extension ?? 'png',
      mimeType: basicFileMock.mimeType ?? 'image/png',
      created: basicFileMock.created,
    };

    const attachmentViewProps: FileViewProps = {
      savedObjectId: 'test-so-id',
      attachmentId: basicFileMock.id,
      metadata: { files: [validFileEntry], soType: FILE_SO_TYPE },
      createdBy: { username: 'elastic', fullName: null, email: null, profileUid: undefined },
      version: '1',
      caseData: { title: basicCase.title, id: basicCase.id },
      permissions: allCasesPermissions(),
      rowContext: {
        appId: 'cases',
        manageMarkdownEditIds: [],
        selectedOutlineCommentId: '',
        loadingCommentIds: [],
        euiTheme,
      },
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('event renders a clickable name if the file is an image', async () => {
      renderWithTestingProviders(
        // @ts-expect-error: event is a React element, not a string
        fileType.getCreationActivity(attachmentViewProps).event
      );

      expect(await screen.findByText('my-super-cool-screenshot.png')).toBeInTheDocument();
      expect(screen.queryByTestId('cases-files-image-preview')).not.toBeInTheDocument();
    });

    it('clicking the name rendered in event opens the file preview', async () => {
      renderWithTestingProviders(
        // @ts-expect-error: event is a React element, not a string
        fileType.getCreationActivity(attachmentViewProps).event
      );

      await userEvent.click(await screen.findByText('my-super-cool-screenshot.png'));
      expect(await screen.findByTestId('cases-files-image-preview')).toBeInTheDocument();
    });

    it('getActions renders a download button', async () => {
      const creationActivity = fileType.getCreationActivity(attachmentViewProps);

      const actions = creationActivity.getActions?.(attachmentViewProps) ?? [];

      expect(actions.length).toBe(2);
      expect(actions[0]).toStrictEqual({
        type: AttachmentActionType.CUSTOM,
        isPrimary: false,
        render: expect.any(Function),
      });

      // @ts-expect-error: render exists on CustomAttachmentAction
      renderWithTestingProviders(actions[0].render());

      expect(await screen.findByTestId('cases-files-download-button')).toBeInTheDocument();
    });

    it('getActions renders a delete button', async () => {
      const creationActivity = fileType.getCreationActivity(attachmentViewProps);

      const actions = creationActivity.getActions?.(attachmentViewProps) ?? [];

      expect(actions.length).toBe(2);
      expect(actions[1]).toStrictEqual({
        type: AttachmentActionType.CUSTOM,
        isPrimary: false,
        render: expect.any(Function),
      });

      // @ts-expect-error: render exists on CustomAttachmentAction
      renderWithTestingProviders(actions[1].render());

      expect(await screen.findByTestId('cases-files-delete-button')).toBeInTheDocument();
    });

    it('clicking the delete button in actions opens deletion modal', async () => {
      const creationActivity = fileType.getCreationActivity(attachmentViewProps);

      const actions = creationActivity.getActions?.(attachmentViewProps) ?? [];

      // @ts-expect-error: render exists on CustomAttachmentAction
      renderWithTestingProviders(actions[1].render());

      const deleteButton = await screen.findByTestId('cases-files-delete-button');
      expect(deleteButton).toBeInTheDocument();

      await userEvent.click(deleteButton);

      expect(await screen.findByTestId('property-actions-confirm-modal')).toBeInTheDocument();
    });

    it('getActions delete control is hidden without delete permission', async () => {
      const creationActivity = fileType.getCreationActivity(attachmentViewProps);
      const actions = creationActivity.getActions?.(attachmentViewProps) ?? [];

      // @ts-expect-error: render exists on CustomAttachmentAction
      renderWithTestingProviders(actions[1].render(), {
        wrapperProps: { permissions: buildCasesPermissions({ delete: false }) },
      });

      expect(screen.queryByTestId('cases-files-delete-button')).not.toBeInTheDocument();
    });

    it('getActions omits the delete action entirely without delete permission', () => {
      const noDeletePermissions = buildCasesPermissions({ delete: false });
      const creationActivity = fileType.getCreationActivity({
        ...attachmentViewProps,
        permissions: noDeletePermissions,
      });

      const actions =
        creationActivity.getActions?.({
          ...attachmentViewProps,
          permissions: noDeletePermissions,
        }) ?? [];

      expect(actions.length).toBe(1);
      expect(screen.queryByTestId('cases-files-delete-button')).not.toBeInTheDocument();
    });

    it('empty metadata returns a creation activity with a delete action', () => {
      expect(
        fileType.getCreationActivity({
          ...attachmentViewProps,
          metadata: undefined,
        })
      ).toEqual({
        event: 'added an unknown file',
        hideDefaultActions: true,
        getActions: expect.any(Function),
      });
    });

    it('getIcon is image if file is an image', () => {
      expect(fileType.getIcon(attachmentViewProps)).toBe('image');
    });

    it('children is defined when file is an image', () => {
      const creationActivity = fileType.getCreationActivity(attachmentViewProps);
      expect(creationActivity).toEqual(
        expect.objectContaining({
          children: expect.any(Object),
        })
      );
    });

    it('getIcon is document if file is not an image', () => {
      expect(
        fileType.getIcon({
          ...attachmentViewProps,
          metadata: { files: [{ ...validFileEntry, mimeType: 'text/csv' }], soType: FILE_SO_TYPE },
        })
      ).toBe('document');
    });

    it('default actions should be hidden', () => {
      expect(fileType.getCreationActivity(attachmentViewProps)).toEqual(
        expect.objectContaining({
          hideDefaultActions: true,
        })
      );
    });
  });

  describe('getRemovalActivity', () => {
    it('event renders the right message', () => {
      expect(fileType.getRemovalActivity?.(undefined as never).event).toBe('removed file');
    });
  });
});
