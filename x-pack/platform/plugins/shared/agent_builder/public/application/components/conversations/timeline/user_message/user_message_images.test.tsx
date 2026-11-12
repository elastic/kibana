/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render as rtlRender, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { ThumbnailAttachmentPill } from '../../conversation_input/thumbnail_attachment_pill';
import type { UserMessageThumbnail } from './use_user_message_thumbnails';
import { UserMessageImages } from './user_message_images';
import { ImagePreviewModal } from './image_preview_modal';

jest.mock('../../conversation_input/thumbnail_attachment_pill', () => ({
  ThumbnailAttachmentPill: jest.fn(({ attachmentId }: { attachmentId: string }) => (
    <div data-test-subj={`agentBuilderAttachmentPill-${attachmentId}`} />
  )),
}));

jest.mock('./image_preview_modal', () => ({
  ImagePreviewModal: jest.fn(() => <div data-test-subj="agentBuilderImagePreviewModal" />),
}));

const MockThumbnailAttachmentPill = jest.mocked(ThumbnailAttachmentPill);
const MockImagePreviewModal = jest.mocked(ImagePreviewModal);

const render = (ui: React.ReactElement) => rtlRender(<EuiThemeProvider>{ui}</EuiThemeProvider>);

const makeThumbnail = (id: string, name: string): UserMessageThumbnail => ({
  key: `${id}-v1`,
  attachmentId: id,
  thumbnailUrl: 'data:image/png;base64,abc',
  label: name,
  name,
});

describe('UserMessageImages', () => {
  beforeEach(() => {
    MockThumbnailAttachmentPill.mockClear();
    MockImagePreviewModal.mockClear();
  });

  it('renders nothing when there are no thumbnails', () => {
    const { container } = render(<UserMessageImages thumbnails={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('highlights only the thumbnail whose name matches hoveredImageName', () => {
    render(
      <UserMessageImages
        thumbnails={[makeThumbnail('img1', 'photo.png'), makeThumbnail('img2', 'shot.png')]}
        hoveredImageName="photo.png"
      />
    );

    const highlightByAttachmentId = Object.fromEntries(
      MockThumbnailAttachmentPill.mock.calls.map(([props]) => [
        props.attachmentId,
        props.isHighlighted,
      ])
    );
    // One pill per thumbnail, and only the hovered one is highlighted.
    expect(highlightByAttachmentId).toEqual({ img1: true, img2: false });
  });

  it('opens the clicked image in the preview modal and closes it on onClose', () => {
    render(
      <UserMessageImages
        thumbnails={[makeThumbnail('img1', 'photo.png'), makeThumbnail('img2', 'shot.png')]}
      />
    );
    expect(screen.queryByTestId('agentBuilderImagePreviewModal')).not.toBeInTheDocument();

    const secondPillProps = MockThumbnailAttachmentPill.mock.calls[1][0];
    act(() => secondPillProps.onClick?.());

    const modalProps = MockImagePreviewModal.mock.lastCall?.[0];
    expect(modalProps).toEqual(
      expect.objectContaining({ src: 'data:image/png;base64,abc', label: 'shot.png' })
    );

    act(() => modalProps?.onClose());
    expect(screen.queryByTestId('agentBuilderImagePreviewModal')).not.toBeInTheDocument();
  });
});
