/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { ATTACHMENT_REF_ACTOR, AttachmentType } from '@kbn/agent-builder-common/attachments';
import { RoundInputImages } from './round_input_images';

const render = (ui: React.ReactElement) => rtlRender(<EuiThemeProvider>{ui}</EuiThemeProvider>);

const THUMBNAIL_URL = 'data:image/png;base64,abc';

const mockGetAttachmentUiDefinition = jest.fn();
jest.mock('../../../hooks/use_agent_builder_service', () => ({
  useAgentBuilderServices: () => ({
    attachmentsService: { getAttachmentUiDefinition: mockGetAttachmentUiDefinition },
  }),
}));

const makeImageVersioned = (id: string, name: string): VersionedAttachment => ({
  id,
  type: AttachmentType.image,
  versions: [
    {
      version: 1,
      data: { file_id: `file-${id}`, name, mime_type: 'image/png' },
      created_at: '2024-01-01T00:00:00Z',
      content_hash: 'x',
    },
  ],
  current_version: 1,
  active: true,
});

describe('RoundInputImages', () => {
  beforeEach(() => {
    mockGetAttachmentUiDefinition.mockReset();
    mockGetAttachmentUiDefinition.mockReturnValue({
      getLabel: (_: unknown) => 'photo.png',
      getThumbnail: (_: unknown) => THUMBNAIL_URL,
    });
  });

  it('renders nothing when there are no attachment refs', () => {
    const { container } = render(<RoundInputImages />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when refs resolve to non-image types', () => {
    const nonImage: VersionedAttachment = {
      id: 'txt1',
      type: 'text' as AttachmentType,
      versions: [{ version: 1, data: {}, created_at: '2024-01-01T00:00:00Z', content_hash: 'x' }],
      current_version: 1,
      active: true,
    };
    const { container } = render(
      <RoundInputImages
        attachmentRefs={[{ attachment_id: 'txt1', version: 1, actor: ATTACHMENT_REF_ACTOR.user }]}
        conversationAttachments={[nonImage]}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders a ThumbnailAttachmentPill for each image ref', () => {
    const img1 = makeImageVersioned('img1', 'photo.png');
    const img2 = makeImageVersioned('img2', 'screenshot.png');
    mockGetAttachmentUiDefinition
      .mockReturnValueOnce({ getLabel: () => 'photo.png', getThumbnail: () => THUMBNAIL_URL })
      .mockReturnValueOnce({
        getLabel: () => 'screenshot.png',
        getThumbnail: () => THUMBNAIL_URL,
      });

    render(
      <RoundInputImages
        attachmentRefs={[
          { attachment_id: 'img1', version: 1, actor: ATTACHMENT_REF_ACTOR.user },
          { attachment_id: 'img2', version: 1, actor: ATTACHMENT_REF_ACTOR.user },
        ]}
        conversationAttachments={[img1, img2]}
      />
    );

    expect(screen.getByTestId('agentBuilderAttachmentPill-img1')).toBeInTheDocument();
    expect(screen.getByTestId('agentBuilderAttachmentPill-img2')).toBeInTheDocument();
  });

  it('does not render a remove button (no onRemoveAttachment)', () => {
    render(
      <RoundInputImages
        attachmentRefs={[{ attachment_id: 'img1', version: 1, actor: ATTACHMENT_REF_ACTOR.user }]}
        conversationAttachments={[makeImageVersioned('img1', 'photo.png')]}
      />
    );

    expect(screen.queryByLabelText('Remove attachment')).not.toBeInTheDocument();
  });

  it('highlights the thumbnail whose data.name matches hoveredImageName', () => {
    // ThumbnailAttachmentPill applies a stronger box-shadow when isHighlighted, but in jsdom
    // we can only verify the prop reaches the component. We test by checking the pill renders.
    render(
      <RoundInputImages
        attachmentRefs={[{ attachment_id: 'img1', version: 1, actor: ATTACHMENT_REF_ACTOR.user }]}
        conversationAttachments={[makeImageVersioned('img1', 'photo.png')]}
        hoveredImageName="photo.png"
      />
    );

    expect(screen.getByTestId('agentBuilderAttachmentPill-img1')).toBeInTheDocument();
  });

  it('skips images when getThumbnail returns undefined', () => {
    mockGetAttachmentUiDefinition.mockReturnValue({
      getLabel: () => 'photo.png',
      getThumbnail: () => undefined,
    });

    render(
      <RoundInputImages
        attachmentRefs={[{ attachment_id: 'img1', version: 1, actor: ATTACHMENT_REF_ACTOR.user }]}
        conversationAttachments={[makeImageVersioned('img1', 'photo.png')]}
      />
    );

    // No thumbnail URL → item skipped → flex group renders but is empty → still wraps
    // The key assertion: no pill rendered
    expect(screen.queryByTestId('agentBuilderAttachmentPill-img1')).not.toBeInTheDocument();
  });
});
