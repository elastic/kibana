/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { JsonValue } from '@kbn/utility-types';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';

import type { ExternalReferenceAttachmentViewProps } from '../../../client/attachment_framework/types';

import { AttachmentActionType } from '../../../client/attachment_framework/types';
import { basicCase, basicFileMock } from '../../../containers/mock';
import { getFileType } from './file_type';
import { FILE_ATTACHMENT_TYPE } from '../../../../common/constants';
import { renderWithTestingProviders } from '../../../common/mock';

describe('getFileType', () => {
  const fileType = getFileType();

  it('invalid props return blank FileAttachmentViewObject', () => {
    expect(fileType).toStrictEqual({
      id: FILE_ATTACHMENT_TYPE,
      icon: 'document',
      displayName: 'Files',
      getAttachmentViewObject: expect.any(Function),
      getAttachmentRemovalObject: expect.any(Function),
    });
  });

  describe('getFileAttachmentViewObject', () => {
    const attachmentViewProps: ExternalReferenceAttachmentViewProps = {
      externalReferenceId: basicFileMock.id,
      // @ts-expect-error: files is a proper JSON
      externalReferenceMetadata: { files: [basicFileMock] },
      caseData: { title: basicCase.title, id: basicCase.id },
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('event renders a clickable name if the file is an image', async () => {
      renderWithTestingProviders(
        // @ts-expect-error: event is defined
        fileType.getAttachmentViewObject({ ...attachmentViewProps }).event
      );

      expect(await screen.findByText('my-super-cool-screenshot.png')).toBeInTheDocument();
      expect(screen.queryByTestId('cases-files-image-preview')).not.toBeInTheDocument();
    });

    it('clicking the name rendered in event opens the file preview', async () => {
      renderWithTestingProviders(
        // @ts-expect-error: event is a React element
        fileType.getAttachmentViewObject({ ...attachmentViewProps }).event
      );

      await userEvent.click(await screen.findByText('my-super-cool-screenshot.png'));
      expect(await screen.findByTestId('cases-files-image-preview')).toBeInTheDocument();
    });

    it('getActions renders a download button', async () => {
      const attachmentViewObject = fileType.getAttachmentViewObject({ ...attachmentViewProps });

      expect(attachmentViewObject).not.toBeUndefined();

      // @ts-expect-error: object is defined
      const actions = attachmentViewObject.getActions();

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
      const attachmentViewObject = fileType.getAttachmentViewObject({ ...attachmentViewProps });

      expect(attachmentViewObject).not.toBeUndefined();

      // @ts-expect-error: object is defined
      const actions = attachmentViewObject.getActions();

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
      const attachmentViewObject = fileType.getAttachmentViewObject({ ...attachmentViewProps });

      expect(attachmentViewObject).not.toBeUndefined();

      // @ts-expect-error: object is defined
      const actions = attachmentViewObject.getActions();

      expect(actions.length).toBe(2);
      expect(actions[1]).toStrictEqual({
        type: AttachmentActionType.CUSTOM,
        isPrimary: false,
        render: expect.any(Function),
      });

      // @ts-expect-error: render exists on CustomAttachmentAction
      renderWithTestingProviders(actions[1].render());

      const deleteButton = await screen.findByTestId('cases-files-delete-button');

      expect(deleteButton).toBeInTheDocument();

      await userEvent.click(deleteButton);

      expect(await screen.findByTestId('property-actions-confirm-modal')).toBeInTheDocument();
    });

    it('empty externalReferenceMetadata returns blank FileAttachmentViewObject', () => {
      expect(
        fileType.getAttachmentViewObject({
          ...attachmentViewProps,
          externalReferenceMetadata: {},
        })
      ).toEqual({
        event: 'added an unknown file',
        hideDefaultActions: true,
        timelineAvatar: 'document',
        getActions: expect.any(Function),
      });
    });

    it('timelineAvatar is image if file is an image', () => {
      expect(fileType.getAttachmentViewObject(attachmentViewProps)).toEqual(
        expect.objectContaining({
          timelineAvatar: 'image',
        })
      );
    });

    it('children is defined when file is an image', () => {
      const attachmentViewObject = fileType.getAttachmentViewObject(attachmentViewProps);
      expect(attachmentViewObject).toEqual(
        expect.objectContaining({
          children: expect.any(Object),
        })
      );
    });

    it('timelineAvatar is document if file is not an image', () => {
      expect(
        fileType.getAttachmentViewObject({
          ...attachmentViewProps,
          externalReferenceMetadata: {
            files: [{ ...basicFileMock, mimeType: 'text/csv' } as JsonValue],
          },
        })
      ).toEqual(
        expect.objectContaining({
          timelineAvatar: 'document',
        })
      );
    });

    it('default actions should be hidden', () => {
      expect(fileType.getAttachmentViewObject(attachmentViewProps)).toEqual(
        expect.objectContaining({
          hideDefaultActions: true,
        })
      );
    });
  });

  describe('getFileAttachmentRemovalObject', () => {
    it('event renders the right message', async () => {
      // @ts-expect-error: object is defined
      expect(fileType.getAttachmentRemovalObject().event).toBe('removed file');
    });
  });
});
