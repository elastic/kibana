/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { PropsWithChildren } from 'react';
import { EuiFlyout, EuiProvider } from '@elastic/eui';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { FlyoutTemplate } from '@kbn/flyout-template';
import { httpServiceMock } from '@kbn/core/public/mocks';
import type { Conversation } from '@kbn/agent-builder-common';
import type {
  ConversationTemplateDetailsFlyoutModule,
  ConversationTemplateUIDefinition,
} from '@kbn/agent-builder-browser';
import { AttachmentType, type TextAttachment } from '@kbn/agent-builder-common/attachments';
import { AttachmentsService, createPublicAttachmentContract } from '../services/attachments';
import {
  ConversationTemplatesService,
  createPublicConversationTemplatesContract,
} from '../services/conversation_templates';
import type { ConversationsService } from '../services/conversations/conversations_service';
import { useConversation } from '../application/hooks/use_conversation';
import { useAgentBuilderServices } from '../application/hooks/use_agent_builder_service';
import {
  ConversationDetailsFlyout,
  ConversationDetailsFlyoutContent,
  ConversationDetailsFlyoutSnapshot,
} from './conversation_details_flyout';

jest.mock('../application/hooks/use_conversation');
jest.mock('../application/hooks/use_agent_builder_service');
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  const { createElement } = jest.requireActual('react');
  return { ...actual, EuiFlyout: jest.fn((props) => createElement(actual.EuiFlyout, props)) };
});

const ERROR_BODY = 'Something went wrong while loading this conversation.';

/** The hosts render the content inside a frame, which shows its loading state while a module loads. */
const FrameWrapper = ({ children }: PropsWithChildren) => (
  <EuiProvider>
    <FlyoutTemplate.Frame onClose={jest.fn()} flyoutMenuProps={{ title: 'Summary' }}>
      {children}
    </FlyoutTemplate.Frame>
  </EuiProvider>
);

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
      getConversationUrl: jest.fn(),
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
  const props = { conversationTemplatesService, onClose: jest.fn(), isOpenedFromChat: false };
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
        getConversationUrl: jest.fn(),
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
        load: async () => ({
          useDetailsFlyout: ({ conversation }) => ({ header: { title: conversation.title } }),
        }),
      },
    }));
    return conversationTemplatesService;
  };

  const renderSnapshot = (onNotFound?: () => void) => {
    const get = jest.fn();
    const conversationsService = { get } as unknown as ConversationsService;
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
      // Several tests reject on purpose; react-query would otherwise log each failure.
      logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    });
    const Wrapper = ({ children }: PropsWithChildren) => (
      <FrameWrapper>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </FrameWrapper>
    );
    const renderResult = () =>
      render(
        <ConversationDetailsFlyoutSnapshot
          conversationId="conversation"
          conversationsService={conversationsService}
          conversationTemplatesService={createTemplatesService()}
          onNotFound={onNotFound}
          onClose={jest.fn()}
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

  it('reports a missing conversation once and stops polling', async () => {
    const onNotFound = jest.fn();
    const { get, renderResult } = renderSnapshot(onNotFound);
    get.mockRejectedValue({ response: { status: 404 } });

    renderResult();

    await waitFor(() => expect(onNotFound).toHaveBeenCalledTimes(1));
    await advance(15_000);

    expect(get).toHaveBeenCalledTimes(1);
    expect(onNotFound).toHaveBeenCalledTimes(1);
  });

  it('keeps polling after a transient error exhausts its retries and recovers once the backend does', async () => {
    const onNotFound = jest.fn();
    const { get, renderResult } = renderSnapshot(onNotFound);
    const serverError = { response: { status: 500 } };
    get
      .mockRejectedValueOnce(serverError)
      .mockRejectedValueOnce(serverError)
      .mockRejectedValueOnce(serverError)
      .mockRejectedValueOnce(serverError)
      .mockResolvedValue(createConversation({ title: 'Recovered' }));

    renderResult();
    // Retries back off 1s, 2s, 4s and each waits on the previous rejection, so step the clock.
    for (let elapsed = 0; elapsed < 8; elapsed++) {
      await advance(1_000);
    }

    expect(get).toHaveBeenCalledTimes(4);
    expect(await screen.findByText(ERROR_BODY)).toBeInTheDocument();

    await advance(5_000);

    expect(await screen.findByText('Recovered')).toBeInTheDocument();
    expect(onNotFound).not.toHaveBeenCalled();
  });

  it('omits refetchConversation for the in-chat host', async () => {
    render(
      <ConversationDetailsFlyoutContent
        isOpenedFromChat
        conversation={createConversation()}
        conversationTemplatesService={createTemplatesService()}
        onClose={jest.fn()}
      />,
      { wrapper: FrameWrapper }
    );

    expect(await screen.findByText('No refetch')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Refetch' })).not.toBeInTheDocument();
  });
});

describe('ConversationDetailsFlyoutContent', () => {
  const createService = ({
    tabs = [],
    detailsFlyout,
  }: {
    tabs?: string[];
    detailsFlyout?: ConversationTemplateUIDefinition['detailsFlyout'];
  }) => {
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
        getConversationUrl: jest.fn(),
      },
    });
    conversationTemplates.registerTab('test.first', () => ({
      label: 'First',
      content: () => <p>First tab content</p>,
    }));
    conversationTemplates.registerTab('test.second', () => ({
      label: 'Second',
      content: () => <p>Second tab content</p>,
    }));
    conversationTemplates.registerTemplateUIDefinition('test', () => ({
      name: 'Test',
      tabs,
      detailsFlyout,
    }));
    return conversationTemplatesService;
  };

  const renderContent = (
    conversationTemplatesService: ConversationTemplatesService,
    conversation = createConversation()
  ) =>
    render(
      <ConversationDetailsFlyoutContent
        isOpenedFromChat={false}
        conversation={conversation}
        conversationTemplatesService={conversationTemplatesService}
        onClose={jest.fn()}
      />,
      { wrapper: FrameWrapper }
    );

  it('shows the loading header until the template module loads', async () => {
    let resolveModule: (module: ConversationTemplateDetailsFlyoutModule) => void = () => {};
    const load = () =>
      new Promise<ConversationTemplateDetailsFlyoutModule>((resolve) => {
        resolveModule = resolve;
      });

    renderContent(createService({ detailsFlyout: { load } }));

    expect(screen.getByRole('heading', { name: 'Summary' })).toBeInTheDocument();
    expect(screen.getByTestId('flyoutHeaderTitleLoading')).toBeInTheDocument();

    await act(async () =>
      resolveModule({ useDetailsFlyout: () => ({ header: { title: 'Loaded title' } }) })
    );

    expect(screen.getByRole('heading', { name: 'Loaded title' })).toBeInTheDocument();
    expect(screen.queryByTestId('flyoutHeaderTitleLoading')).not.toBeInTheDocument();
  });

  it('renders the header blocks and footer actions the template module describes, inside its Provider', async () => {
    const ProviderContext = React.createContext('missing');
    const onOpenChat = jest.fn();
    const load = async (): Promise<ConversationTemplateDetailsFlyoutModule> => ({
      Provider: ({ children }) => (
        <ProviderContext.Provider value="provided">{children}</ProviderContext.Provider>
      ),
      useDetailsFlyout: ({ conversation }) => {
        const value = React.useContext(ProviderContext);
        return {
          header: {
            title: conversation.title,
            infoBlocks: [{ title: 'Context', children: value }],
          },
          footer: { secondary: { label: 'Open chat', onClick: onOpenChat } },
        };
      },
    });

    renderContent(createService({ detailsFlyout: { load } }));
    await act(async () => {});

    expect(screen.getByRole('heading', { name: 'Original content' })).toBeInTheDocument();
    expect(screen.getByText('Context')).toBeInTheDocument();
    expect(screen.getByText('provided')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open chat' }));
    expect(onOpenChat).toHaveBeenCalledTimes(1);
  });

  it('shows the error state when the template module fails to load', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const load = () => Promise.reject(new Error('chunk failed'));

    renderContent(createService({ detailsFlyout: { load } }));
    await act(async () => {});

    expect(screen.getByText(ERROR_BODY)).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it('loads the template module again on the next open after a failed load', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const load = jest
      .fn<Promise<ConversationTemplateDetailsFlyoutModule>, []>()
      .mockRejectedValueOnce(new Error('chunk failed'))
      .mockResolvedValue({ useDetailsFlyout: () => ({ header: { title: 'Loaded title' } }) });
    const service = createService({ detailsFlyout: { load } });

    const { unmount } = renderContent(service);
    await act(async () => {});
    expect(screen.getByText(ERROR_BODY)).toBeInTheDocument();
    unmount();

    renderContent(service);
    await act(async () => {});

    expect(screen.getByRole('heading', { name: 'Loaded title' })).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
    consoleError.mockRestore();
  });

  it('renders a single tab as the body, with no tab bar', () => {
    renderContent(createService({ tabs: ['test.first'] }));

    expect(screen.getByText('First tab content')).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('renders two or more tabs with a tab bar', () => {
    renderContent(createService({ tabs: ['test.first', 'test.second'] }));

    expect(screen.getByRole('tab', { name: 'First' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('First tab content')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Second' }));

    expect(screen.getByText('Second tab content')).toBeInTheDocument();
  });

  it('gives the zones, tab bar, and tabs test subjects that do not depend on the host', async () => {
    const load = async (): Promise<ConversationTemplateDetailsFlyoutModule> => ({
      useDetailsFlyout: () => ({
        header: { title: 'Loaded title' },
        footer: { primary: { label: 'Act', onClick: jest.fn() } },
      }),
    });

    renderContent(createService({ tabs: ['test.first', 'test.second'], detailsFlyout: { load } }));
    await act(async () => {});

    expect(screen.getByTestId('agentBuilderConversationDetailsFlyoutHeader')).toBeInTheDocument();
    expect(screen.getByTestId('agentBuilderConversationDetailsFlyoutBody')).toBeInTheDocument();
    expect(screen.getByTestId('agentBuilderConversationDetailsFlyoutFooter')).toBeInTheDocument();
    expect(screen.getByTestId('agentBuilderConversationDetailsFlyoutTabs')).toHaveAttribute(
      'aria-label',
      'Summary tabs'
    );
    expect(
      screen.getByTestId('agentBuilderConversationDetailsFlyoutTab-test.second')
    ).toHaveAttribute('role', 'tab');
  });

  it('titles the flyout "Summary" for a conversation with no template', () => {
    renderContent(createService({}), createConversation({ template_id: undefined }));

    expect(screen.getByRole('heading', { name: 'Summary' })).toBeInTheDocument();
    expect(screen.getByText(ERROR_BODY)).toBeInTheDocument();
  });

  it('shows the error state for a template that registers no details flyout and no tabs', () => {
    renderContent(createService({}));

    expect(screen.getByText(ERROR_BODY)).toBeInTheDocument();
  });

  it('shows the tabs of a template that registers no details flyout', () => {
    renderContent(createService({ tabs: ['test.first'] }));

    expect(screen.getByText('First tab content')).toBeInTheDocument();
    expect(screen.queryByText(ERROR_BODY)).not.toBeInTheDocument();
  });
});

describe('ConversationDetailsFlyout', () => {
  it('renders the template trailing actions in the menu bar', () => {
    const trailingActions = jest.fn(() => [
      { iconType: 'link', 'aria-label': 'Copy link', onClick: jest.fn() },
    ]);
    const conversationTemplatesService = new ConversationTemplatesService();
    createPublicConversationTemplatesContract({
      conversationTemplatesService,
      context: {
        attachmentsService: createPublicAttachmentContract({
          attachmentsService: new AttachmentsService({
            http: httpServiceMock.createSetupContract(),
          }),
        }),
        openSidebarConversation: jest.fn(),
        openFullscreenConversation: jest.fn(),
        getConversationUrl: jest.fn(),
      },
    }).registerTemplateUIDefinition('test', () => ({
      name: 'Test',
      tabs: [],
      detailsFlyout: { trailingActions },
    }));
    const conversation = createConversation();
    jest.mocked(useConversation).mockReturnValue({
      conversation,
      isLoading: false,
    } as ReturnType<typeof useConversation>);
    jest.mocked(useAgentBuilderServices).mockReturnValue({
      conversationTemplatesService,
    } as ReturnType<typeof useAgentBuilderServices>);

    render(<ConversationDetailsFlyout onClose={jest.fn()} />, { wrapper: EuiProvider });

    // EUI's test-env EuiFlyout doesn't render the menu, so assert on the props it receives.
    const [{ flyoutMenuProps }] = jest.mocked(EuiFlyout).mock.lastCall ?? [{}];
    expect(trailingActions).toHaveBeenCalledWith({ conversation });
    expect(flyoutMenuProps?.trailingActions).toEqual(trailingActions.mock.results[0].value);
  });

  it('opens resizable at the remembered width', () => {
    localStorage.setItem('agentBuilder.conversationDetailsFlyoutWidth', '620');
    jest.mocked(useConversation).mockReturnValue({
      conversation: createConversation(),
      isLoading: false,
    } as ReturnType<typeof useConversation>);
    jest.mocked(useAgentBuilderServices).mockReturnValue({
      conversationTemplatesService: new ConversationTemplatesService(),
    } as ReturnType<typeof useAgentBuilderServices>);

    render(<ConversationDetailsFlyout onClose={jest.fn()} />, { wrapper: EuiProvider });

    const [flyoutProps] = jest.mocked(EuiFlyout).mock.lastCall ?? [{}];
    expect(flyoutProps).toEqual(
      expect.objectContaining({ size: 620, minWidth: 400, maxWidth: 640, resizable: true })
    );
  });
});
