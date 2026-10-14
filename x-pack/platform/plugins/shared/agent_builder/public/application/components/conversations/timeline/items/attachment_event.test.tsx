/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { useConversationId } from '../../../../context/conversation/use_conversation_id';
import { InlineAttachmentWithActions } from '../response/attachments/inline_attachment_with_actions';
import { createAttachmentItem } from './timeline_item.factory';
import { createVersionedAttachment } from './versioned_attachment.factory';
import { AttachmentEvent } from './attachment_event';

const mockAttachmentsService = { hasAttachmentType: jest.fn() };

jest.mock('../../../../hooks/use_agent_builder_service', () => ({
  useAgentBuilderServices: () => ({ attachmentsService: mockAttachmentsService }),
}));
jest.mock('../../../../context/conversation/use_conversation_id', () => ({
  useConversationId: jest.fn(),
}));
jest.mock('../../../../context/conversation/conversation_context', () => ({
  useConversationContext: () => ({ isEmbeddedContext: true }),
}));
jest.mock('../response/attachments/inline_attachment_with_actions', () => ({
  InlineAttachmentWithActions: jest.fn(() => <div data-test-subj="inlineCard" />),
}));

const mockInlineCard = jest.mocked(InlineAttachmentWithActions);
const lastCardProps = () => mockInlineCard.mock.calls.at(-1)![0];

describe('AttachmentEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useConversationId).mockReturnValue('conv-1');
  });

  it('draws the inline card for the resolved version', () => {
    const attachment = createVersionedAttachment({
      current_version: 2,
      versions: [
        {
          version: 1,
          data: { title: 'v1' },
          created_at: '2026-09-03T11:17:50.000Z',
          content_hash: 'a',
        },
        {
          version: 2,
          data: { title: 'v2' },
          created_at: '2026-09-03T11:18:50.000Z',
          content_hash: 'b',
        },
      ],
    });
    const item = createAttachmentItem({ attachment, version: 2 });

    render(<AttachmentEvent item={item} />);

    expect(screen.getByTestId('inlineCard')).toBeInTheDocument();
    const props = lastCardProps();
    expect(props.attachment.id).toBe(attachment.id);
    expect(props.attachment.data).toEqual({ title: 'v2' });
    expect(props.attachment.versionData).toMatchObject({
      version: 2,
      versionCount: 2,
      previousVersionData: { title: 'v1' },
    });
    expect(props.conversationId).toBe('conv-1');
    expect(props.attachmentsService).toBe(mockAttachmentsService);
    expect(props.isSidebar).toBe(true);
  });

  it('passes the latest screen context from the conversation attachments', () => {
    const screenContext = createVersionedAttachment({
      id: 'sc-1',
      type: AttachmentType.screenContext,
      versions: [
        {
          version: 1,
          data: { url: '/app/x' },
          created_at: '2026-09-03T11:17:50.000Z',
          content_hash: 'c',
        },
      ],
    });

    render(
      <AttachmentEvent item={createAttachmentItem()} conversationAttachments={[screenContext]} />
    );

    expect(lastCardProps().screenContext).toEqual({ url: '/app/x' });
  });

  it('renders nothing without a conversation id', () => {
    jest.mocked(useConversationId).mockReturnValue(undefined);

    const { container } = render(<AttachmentEvent item={createAttachmentItem()} />);

    expect(container).toBeEmptyDOMElement();
  });
});
