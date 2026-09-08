/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, screen } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core/public/mocks';
import type { Conversation } from '@kbn/agent-builder-common';
import { AttachmentType, type TextAttachment } from '@kbn/agent-builder-common/attachments';
import { AttachmentsService, createPublicAttachmentContract } from '../services/attachments';
import {
  ConversationTemplatesService,
  createPublicConversationTemplatesContract,
} from '../services/conversation_templates';
import { ConversationDetailsFlyoutContent } from './conversation_details_flyout';

jest.mock('../application/hooks/use_conversation');
jest.mock('../application/hooks/use_agent_builder_service');

it('provides the live attachment registry at registration without remounting tabs on conversation updates', () => {
  const attachmentsService = new AttachmentsService({
    http: httpServiceMock.createSetupContract(),
  });
  const conversationTemplatesService = new ConversationTemplatesService();
  const conversationTemplates = createPublicConversationTemplatesContract({
    conversationTemplatesService,
    context: {
      attachmentsService: createPublicAttachmentContract({ attachmentsService }),
      openSidebarConversation: jest.fn(),
      openFullscreenConversation: jest.fn(),
    },
  });
  conversationTemplates.registerTab('test.details', ({ attachmentsService: service }) => ({
    label: 'Details',
    content: function TabContent({ conversation }) {
      const [count, setCount] = useState(0);
      const definition = service.getAttachmentUiDefinition<TextAttachment>(AttachmentType.text);
      return (
        <>
          <button onClick={() => setCount(count + 1)}>Clicked {count}</button>
          {definition?.renderConversationDetailsContent?.({
            attachment: {
              id: 'attachment',
              type: AttachmentType.text,
              data: { content: conversation.title },
            },
          })}
        </>
      );
    },
  }));
  conversationTemplates.registerTemplateUIDefinition('test', () => ({
    name: 'Test',
    tabs: ['test.details'],
  }));
  // Attachment types registered after the tab are still available through its captured service.
  attachmentsService.addAttachmentType<TextAttachment>(AttachmentType.text, {
    getLabel: () => 'Text',
    renderConversationDetailsContent: ({ attachment }) => <p>{attachment.data.content}</p>,
  });
  const conversation: Conversation = {
    id: 'conversation',
    agent_id: 'agent',
    user: { username: 'test' },
    title: 'Original content',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    rounds: [],
    template_id: 'test',
  };
  const props = { conversationTemplatesService, titleId: 'title' };
  const { rerender } = render(
    <ConversationDetailsFlyoutContent {...props} conversation={conversation} />,
    { wrapper: EuiProvider }
  );

  expect(screen.getByText('Original content')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Clicked 0' }));
  rerender(
    <ConversationDetailsFlyoutContent
      {...props}
      conversation={{ ...conversation, title: 'Updated content' }}
    />
  );

  expect(screen.getByText('Updated content')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Clicked 1' })).toBeInTheDocument();
});
