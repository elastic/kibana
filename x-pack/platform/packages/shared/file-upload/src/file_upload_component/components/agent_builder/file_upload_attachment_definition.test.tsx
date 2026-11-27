/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { CoreStart } from '@kbn/core/public';
import type { FileUploadResults } from '@kbn/file-upload-common';
import { FILE_UPLOAD_ATTACHMENT_TYPE, type FileUploadAttachment } from '@kbn/file-upload-common';
import type { FileUploadStartDependencies } from '../../kibana_context';
import type { FileUploadPanelProps } from './file_upload_panel';
import { createFileUploadAttachmentDefinition } from './file_upload_attachment_definition';

const mockPanel = jest.fn((_props: FileUploadPanelProps) => <div data-test-subj="mockPanel" />);
jest.mock('./file_upload_panel', () => ({
  FileUploadPanel: (props: FileUploadPanelProps) => mockPanel(props),
}));

const coreStart = {
  notifications: { toasts: { addWarning: jest.fn(), addError: jest.fn() } },
} as unknown as CoreStart;
const plugins = {} as FileUploadStartDependencies;

const attachment = (origin?: string): FileUploadAttachment => ({
  id: 'attachment-1',
  type: FILE_UPLOAD_ATTACHMENT_TYPE,
  data: { reason: 'Analyze your sales export', suggested_index_name: 'sales' },
  origin,
});

const definition = () => createFileUploadAttachmentDefinition(coreStart, plugins);

const renderCanvas = async (updateOrigin: jest.Mock, origin?: string) => {
  const callbacks = { updateOrigin, closeCanvas: jest.fn(), registerActionButtons: jest.fn() };
  render(
    <>
      {definition().renderCanvasContent!(
        { attachment: attachment(origin), isSidebar: false },
        callbacks
      )}
    </>
  );
  await waitFor(() => expect(screen.getByTestId('mockPanel')).toBeInTheDocument());
  const props = mockPanel.mock.calls[mockPanel.mock.calls.length - 1][0];
  return { props, callbacks };
};

describe('createFileUploadAttachmentDefinition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the reason until the file is uploaded, then the index', () => {
    const { rerender } = render(
      <>{definition().renderInlineContent!({ attachment: attachment(), isSidebar: false })}</>
    );
    expect(screen.getByTestId('fileUploadAttachmentInlineText')).toHaveTextContent(
      'Analyze your sales export'
    );

    rerender(
      <>
        {definition().renderInlineContent!({ attachment: attachment('sales'), isSidebar: false })}
      </>
    );
    expect(screen.getByTestId('fileUploadAttachmentInlineText')).toHaveTextContent(
      'Data uploaded to the index sales.'
    );
  });

  describe('getActionButtons', () => {
    const getButtons = (origin?: string, isCanvas = false) => {
      const openCanvas = jest.fn();
      const buttons = definition().getActionButtons!({
        attachment: attachment(origin),
        isSidebar: false,
        isCanvas,
        updateOrigin: jest.fn(),
        openCanvas,
      });
      return { buttons, openCanvas };
    };

    it('opens the side panel from the upload button', async () => {
      const { buttons, openCanvas } = getButtons();

      expect(buttons).toHaveLength(1);
      await buttons[0].handler();
      expect(openCanvas).toHaveBeenCalled();
    });

    it('offers no button once uploaded, or inside the side panel', () => {
      expect(getButtons('sales').buttons).toEqual([]);
      expect(getButtons(undefined, true).buttons).toEqual([]);
    });
  });

  describe('renderCanvasContent', () => {
    it('passes the suggested index name and any uploaded index to the panel', async () => {
      const { props } = await renderCanvas(jest.fn(), 'sales');

      expect(props).toMatchObject({ suggestedIndexName: 'sales', uploadedIndex: 'sales' });
    });

    it('stores the uploaded index as the origin', async () => {
      const updateOrigin = jest.fn().mockResolvedValue({});
      const { props } = await renderCanvas(updateOrigin);

      await props.onUploadComplete({ index: 'sales', files: [] } as FileUploadResults);

      expect(updateOrigin).toHaveBeenCalledWith('sales');
      expect(coreStart.notifications.toasts.addError).not.toHaveBeenCalled();
    });

    it('shows an error toast when the origin cannot be stored', async () => {
      const updateOrigin = jest.fn().mockRejectedValue(new Error('Index does not exist'));
      const { props } = await renderCanvas(updateOrigin);

      await props.onUploadComplete({ index: 'sales', files: [] } as FileUploadResults);

      expect(coreStart.notifications.toasts.addError).toHaveBeenCalled();
    });
  });
});
