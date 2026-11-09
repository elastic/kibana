/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { FileAttachmentPill } from '../../conversation_input/file_attachment_pill';
import { ThumbnailAttachmentPill } from '../../conversation_input/thumbnail_attachment_pill';
import type { UserMessageThumbnail } from './use_user_message_thumbnails';
import type { UserMessageFile } from './use_user_message_files';
import { UserMessageAttachmentTiles } from './user_message_attachment_tiles';

jest.mock('../../conversation_input/thumbnail_attachment_pill', () => ({
  ThumbnailAttachmentPill: jest.fn(({ attachmentId }: { attachmentId: string }) => (
    <div data-test-subj={`agentBuilderAttachmentPill-${attachmentId}`} />
  )),
}));

jest.mock('../../conversation_input/file_attachment_pill', () => ({
  FileAttachmentPill: jest.fn(({ attachmentId }: { attachmentId: string }) => (
    <div data-test-subj={`agentBuilderAttachmentPill-${attachmentId}`} />
  )),
}));

const MockThumbnailAttachmentPill = jest.mocked(ThumbnailAttachmentPill);
const MockFileAttachmentPill = jest.mocked(FileAttachmentPill);

const makeBinary = (id: string, name: string, order = 0): UserMessageFile => ({
  key: `${id}-v1`,
  attachmentId: id,
  name,
  mimeType: 'text/markdown',
  order,
});

const render = (ui: React.ReactElement) => rtlRender(<EuiThemeProvider>{ui}</EuiThemeProvider>);

const makeThumbnail = (id: string, name: string, order = 0): UserMessageThumbnail => ({
  key: `${id}-v1`,
  attachmentId: id,
  thumbnailUrl: 'data:image/png;base64,abc',
  label: name,
  name,
  order,
});

describe('UserMessageAttachmentTiles', () => {
  beforeEach(() => {
    MockThumbnailAttachmentPill.mockClear();
    MockFileAttachmentPill.mockClear();
  });

  it('renders nothing when there are no thumbnails', () => {
    const { container } = render(<UserMessageAttachmentTiles thumbnails={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('highlights only the thumbnail whose name matches hoveredAttachmentName', () => {
    render(
      <UserMessageAttachmentTiles
        thumbnails={[makeThumbnail('img1', 'photo.png'), makeThumbnail('img2', 'shot.png')]}
        hoveredAttachmentName="photo.png"
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

  it('renders a tile for a file, with no thumbnails', () => {
    render(<UserMessageAttachmentTiles thumbnails={[]} files={[makeBinary('doc1', 'notes.md')]} />);

    expect(MockFileAttachmentPill).toHaveBeenCalledTimes(1);
    expect(MockFileAttachmentPill.mock.calls[0][0]).toMatchObject({
      attachmentId: 'doc1',
      name: 'notes.md',
      mimeType: 'text/markdown',
    });
    expect(MockThumbnailAttachmentPill).not.toHaveBeenCalled();
  });

  it('shows images and files in the order they were attached', () => {
    const { container } = render(
      <UserMessageAttachmentTiles
        thumbnails={[makeThumbnail('img1', 'photo.png', 3)]}
        files={[
          makeBinary('doc1', 'notes.md', 0),
          makeBinary('doc2', 'data.csv', 1),
          makeBinary('doc3', 'notes.txt', 2),
        ]}
      />
    );

    const renderedIds = Array.from(
      container.querySelectorAll('[data-test-subj^="agentBuilderAttachmentPill-"]')
    ).map((element) => element.getAttribute('data-test-subj'));
    expect(renderedIds).toEqual([
      'agentBuilderAttachmentPill-doc1',
      'agentBuilderAttachmentPill-doc2',
      'agentBuilderAttachmentPill-doc3',
      'agentBuilderAttachmentPill-img1',
    ]);
  });

  it('highlights only the file whose name matches hoveredAttachmentName', () => {
    render(
      <UserMessageAttachmentTiles
        thumbnails={[]}
        files={[makeBinary('doc1', 'notes.md'), makeBinary('doc2', 'other.md')]}
        hoveredAttachmentName="notes.md"
      />
    );

    const highlightByAttachmentId = Object.fromEntries(
      MockFileAttachmentPill.mock.calls.map(([props]) => [props.attachmentId, props.isHighlighted])
    );
    expect(highlightByAttachmentId).toEqual({ doc1: true, doc2: false });
  });
});
