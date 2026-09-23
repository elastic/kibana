/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { PropsWithChildren } from 'react';
import { EuiProvider } from '@elastic/eui';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { httpServiceMock } from '@kbn/core/public/mocks';
import type { Conversation } from '@kbn/agent-builder-common';
import { AttachmentType, type TextAttachment } from '@kbn/agent-builder-common/attachments';
import { AttachmentsService, createPublicAttachmentContract } from '../services/attachments';
import {
  ConversationTemplatesService,
  createPublicConversationTemplatesContract,
} from '../services/conversation_templates';
import type { ConversationsService } from '../services/conversations/conversations_service';
import {
  ConversationDetailsFlyoutContent,
  ConversationDetailsFlyoutSnapshot,
} from './conversation_details_flyout';

jest.mock('../application/hooks/use_conversation');
jest.mock('../application/hooks/use_agent_builder_service');

const ERROR_BODY = 'Something went wrong while loading this conversation.';

const createConversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: 'conversation',
  agent_id: 'agent',
  user: { username: 'test' },
  title: 'Original content',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  rounds: [],
  template_id: 'test',
  ...overrides,
});

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
  const conversation = createConversation();
  const props = { conversationTemplatesService, titleId: 'title', isOpenedFromChat: false };
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

describe('ConversationDetailsFlyoutSnapshot', () => {
  const createTemplatesService = () => {
    const conversationTemplatesService = new ConversationTemplatesService();
    const conversationTemplates = createPublicConversationTemplatesContract({
      conversationTemplatesService,
      context: {
        attachmentsService: createPublicAttachmentContract({
          attachmentsService: new AttachmentsService({
            http: httpServiceMock.createSetupContract(),
          }),
        }),
        openSidebarConversation: jest.fn(),
        openFullscreenConversation: jest.fn(),
      },
    });
    conversationTemplates.registerTab('test.first', () => ({
      label: 'First',
      content: function FirstTab({ refetchConversation }) {
        const [count, setCount] = useState(0);
        return (
          <>
            <button onClick={() => setCount(count + 1)}>First clicked {count}</button>
            {refetchConversation ? (
              <button onClick={() => refetchConversation()}>Refetch</button>
            ) : (
              <span>No refetch</span>
            )}
          </>
        );
      },
    }));
    conversationTemplates.registerTab('test.second', () => ({
      label: 'Second',
      content: function SecondTab() {
        const [count, setCount] = useState(0);
        return <button onClick={() => setCount(count + 1)}>Second clicked {count}</button>;
      },
    }));
    conversationTemplates.registerTemplateUIDefinition('test', () => ({
      name: 'Test',
      tabs: ['test.first', 'test.second'],
      // The title lives in the header so it stays asserted-on whichever tab is selected.
      detailsFlyout: {
        header: ({ conversation }) => <h4>{conversation.title}</h4>,
      },
    }));
    return conversationTemplatesService;
  };

  const renderSnapshot = () => {
    const get = jest.fn();
    const conversationsService = { get } as unknown as ConversationsService;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const Wrapper = ({ children }: PropsWithChildren) => (
      <EuiProvider>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </EuiProvider>
    );
    const renderResult = () =>
      render(
        <ConversationDetailsFlyoutSnapshot
          conversationId="conversation"
          conversationsService={conversationsService}
          conversationTemplatesService={createTemplatesService()}
          titleId="title"
        />,
        { wrapper: Wrapper }
      );
    return { get, renderResult };
  };

  const advance = (ms: number) => act(async () => void jest.advanceTimersByTime(ms));

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('polls the conversation every 5 seconds while open', async () => {
    const { get, renderResult } = renderSnapshot();
    // Each resolution differs: react-query's structural sharing suppresses re-renders on
    // deeply-equal data, so identical payloads would make an update indistinguishable from none.
    get
      .mockResolvedValueOnce(createConversation({ title: 'First fetch' }))
      .mockResolvedValueOnce(createConversation({ title: 'Second fetch' }))
      .mockResolvedValue(createConversation({ title: 'Third fetch' }));

    renderResult();

    expect(await screen.findByText('First fetch')).toBeInTheDocument();

    await advance(5_000);

    expect(await screen.findByText('Second fetch')).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(2);

    await advance(5_000);

    expect(await screen.findByText('Third fetch')).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(3);
  });

  it('keeps the last good conversation on screen when a poll fails', async () => {
    const { get, renderResult } = renderSnapshot();
    get
      .mockResolvedValueOnce(createConversation({ title: 'First fetch' }))
      .mockRejectedValue(new Error('boom'));

    renderResult();

    expect(await screen.findByText('First fetch')).toBeInTheDocument();

    await advance(5_000);
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    await advance(100);

    expect(screen.getByText('First fetch')).toBeInTheDocument();
    expect(screen.queryByText(ERROR_BODY)).not.toBeInTheDocument();
  });

  it('does not reset the selected tab or remount it on a poll', async () => {
    const { get, renderResult } = renderSnapshot();
    get
      .mockResolvedValueOnce(createConversation({ title: 'First fetch' }))
      .mockResolvedValue(createConversation({ title: 'Second fetch' }));

    renderResult();

    expect(await screen.findByText('First fetch')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Second' }));
    fireEvent.click(screen.getByRole('button', { name: 'Second clicked 0' }));

    await advance(5_000);

    expect(await screen.findByText('Second fetch')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Second' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Second clicked 1' })).toBeInTheDocument();
  });

  it('hands registered tabs a refetchConversation that refetches on demand', async () => {
    const { get, renderResult } = renderSnapshot();
    get
      .mockResolvedValueOnce(createConversation({ title: 'First fetch' }))
      .mockResolvedValue(createConversation({ title: 'Refetched' }));

    renderResult();

    expect(await screen.findByText('First fetch')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Refetch' }));
    });

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(screen.getByText('Refetched')).toBeInTheDocument();
  });

  it('omits refetchConversation for the in-chat host', () => {
    render(
      <ConversationDetailsFlyoutContent
        isOpenedFromChat
        conversation={createConversation()}
        conversationTemplatesService={createTemplatesService()}
        titleId="title"
      />,
      { wrapper: EuiProvider }
    );

    expect(screen.getByText('No refetch')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Refetch' })).not.toBeInTheDocument();
  });
});
