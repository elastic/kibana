/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import type { Conversation } from '@kbn/agent-builder-common';
import type {
  AttachmentServiceStartContract,
  ConversationTemplateDetailsFlyoutRenderProps,
  ConversationTemplateServiceStartContract,
  ConversationTemplateTabDefinition,
  ConversationTemplateUIContext,
  ConversationTemplateUIDefinition,
} from '@kbn/agent-builder-browser';
import {
  getInvestigationTabIds,
  registerAgenticInvestigationTemplateUI,
  registerEscalationTemplateUI,
} from './register';
import type { RenderAssignees, RenderLinkedInvestigations } from './types';
import { ACTIONS_TRANSLATIONS } from '../components/actions/translations';
import {
  FlyoutGroupedAttachments,
  createFlyoutGroupedAttachmentsRegistry,
} from '../components/grouped_attachments';

const conversation: Conversation = {
  id: 'conversation-1',
  agent_id: 'agent',
  user: { username: 'test' },
  title: 'Impossible travel — exec account',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  rounds: [],
  template_id: 'investigation',
  metadata: {
    status: 'open',
    severity: 'high',
    summary: 'A second sign-in replayed the same session cookie.',
  },
};

const attachmentsService = {
  addAttachmentType: jest.fn(),
  getAttachmentUiDefinition: jest.fn(),
  getClient: jest.fn(),
} as unknown as AttachmentServiceStartContract;

/**
 * Stands in for Agent Builder's `ConversationTemplatesService`, including its duplicate-id throw.
 * The real service is covered by the agent_builder plugin's own tests; importing it here would
 * cross a plugin boundary.
 */
const createFakeService = () => {
  const tabs = new Map<string, ConversationTemplateTabDefinition>();
  const templates = new Map<string, ConversationTemplateUIDefinition>();
  const openFullscreenConversation = jest.fn();
  const getConversationUrl = jest.fn(
    ({ conversationId, agentId }: { conversationId: string; agentId: string }) =>
      `http://localhost/app/agent_builder/agents/${agentId}/conversations/${conversationId}?openConversationDetails=true`
  );
  const context: ConversationTemplateUIContext = {
    attachmentsService,
    openSidebarConversation: jest.fn(),
    openFullscreenConversation,
    getConversationUrl,
  };

  const contract: ConversationTemplateServiceStartContract = {
    registerTab: (tabId, createDefinition) => {
      if (tabs.has(tabId)) {
        throw new Error(`Tab id [${tabId}] is already registered`);
      }
      tabs.set(tabId, createDefinition(context));
    },
    getTab: (tabId) => tabs.get(tabId),
    registerTemplateUIDefinition: (templateId, createDefinition) => {
      if (templates.has(templateId)) {
        throw new Error(`Template id [${templateId}] is already registered`);
      }
      templates.set(templateId, createDefinition(context));
    },
    getTemplateUIDefinition: (templateId) => templates.get(templateId),
  };

  return { contract, openFullscreenConversation };
};

/**
 * Loads a template's details flyout module and renders its header and footer the way Agent Builder
 * does: inside the module's `Provider`, with the footer actions as buttons.
 */
const renderDetailsFlyout = async (
  contract: ConversationTemplateServiceStartContract,
  templateId: string,
  props: ConversationTemplateDetailsFlyoutRenderProps
) => {
  const load = contract.getTemplateUIDefinition(templateId)?.detailsFlyout?.load;
  if (!load) {
    throw new Error(`Expected a registered details flyout for template [${templateId}]`);
  }
  const { useDetailsFlyout, Provider } = await load();
  const Flyout = () => {
    const { header, footer } = useDetailsFlyout(props);
    return (
      <>
        <h3>{header.title}</h3>
        {header.badges?.map(({ children, 'data-test-subj': dataTestSubj }, index) => (
          <span key={index} data-test-subj={dataTestSubj}>
            {children}
          </span>
        ))}
        <div>{header.description}</div>
        <div data-test-subj="headerBlocks">
          {header.infoBlocks?.map(({ id, title, children }) => (
            <div key={id}>
              {title}
              {children}
            </div>
          ))}
        </div>
        {[footer?.secondary, footer?.primary].map(
          (action) =>
            action && (
              <button
                key={action.label}
                data-test-subj={action['data-test-subj']}
                onClick={action.onClick}
              >
                {action.label}
              </button>
            )
        )}
      </>
    );
  };
  return renderWithKibanaRenderContext(
    Provider ? (
      <Provider>
        <Flyout />
      </Provider>
    ) : (
      <Flyout />
    )
  );
};

const register = (
  contract: ConversationTemplateServiceStartContract,
  overrides: Partial<Parameters<typeof registerAgenticInvestigationTemplateUI>[0]> = {}
) =>
  registerAgenticInvestigationTemplateUI({
    conversationTemplates: contract,
    templateId: 'investigation',
    groupedAttachments: createFlyoutGroupedAttachmentsRegistry(),
    name: 'Investigation',
    icon: 'securitySignalDetected',
    onCopyLink: () => true,
    ...overrides,
  });

describe('registerAgenticInvestigationTemplateUI', () => {
  it('registers the overview tab', () => {
    const { contract } = createFakeService();

    register(contract);

    expect(contract.getTab('investigation.overview')?.label).toBe('Overview');
    expect(contract.getTemplateUIDefinition('investigation')?.tabs).toEqual([
      'investigation.overview',
    ]);
  });

  it('threads renderProposedActions into the overview tab with the conversation id', async () => {
    const { contract } = createFakeService();
    const renderProposedActions = jest.fn(({ conversationId }: { conversationId: string }) => (
      <span>proposed actions for {conversationId}</span>
    ));
    register(contract, { renderProposedActions });

    const OverviewTabContent = contract.getTab('investigation.overview')?.content;
    if (!OverviewTabContent) {
      throw new Error('Expected a registered overview tab');
    }

    renderWithKibanaRenderContext(
      <OverviewTabContent conversation={conversation} isOpenedFromChat={false} />
    );

    expect(await screen.findByText('proposed actions for conversation-1')).toBeInTheDocument();
  });

  it('omits the proposed actions section when no renderer is supplied', async () => {
    const { contract } = createFakeService();
    register(contract);

    const OverviewTabContent = contract.getTab('investigation.overview')?.content;
    if (!OverviewTabContent) {
      throw new Error('Expected a registered overview tab');
    }

    renderWithKibanaRenderContext(
      <OverviewTabContent conversation={conversation} isOpenedFromChat={false} />
    );

    // Waits for the lazy overview slot's chunk to resolve before asserting it stayed absent.
    expect(
      await screen.findByText('A second sign-in replayed the same session cookie.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Proposed actions')).not.toBeInTheDocument();
  });

  it('replaces the overview body with renderOverview and passes it the proposed actions and their count', async () => {
    const { contract } = createFakeService();
    const renderOverview = jest.fn(
      ({
        conversation: { id },
        proposedActionsContent,
        proposedActionsCount,
      }: {
        conversation: Conversation;
        proposedActionsContent?: React.ReactNode;
        proposedActionsCount?: React.ReactNode;
      }) => (
        <div>
          <span>custom overview for {id}</span>
          {proposedActionsCount}
          {proposedActionsContent}
        </div>
      )
    );
    const groupedAttachments = createFlyoutGroupedAttachmentsRegistry();
    register(contract, {
      groupedAttachments,
      renderOverview,
      renderProposedActions: () => <span>proposals</span>,
      renderProposedActionsCount: () => <span>3 proposals</span>,
    });

    const OverviewTabContent = contract.getTab('investigation.overview')?.content;
    if (!OverviewTabContent) {
      throw new Error('Expected a registered overview tab');
    }
    renderWithKibanaRenderContext(
      <OverviewTabContent conversation={conversation} isOpenedFromChat={false} />
    );

    expect(await screen.findByText('custom overview for conversation-1')).toBeInTheDocument();
    expect(screen.getByText('proposals')).toBeInTheDocument();
    expect(screen.getByText('3 proposals')).toBeInTheDocument();
    expect(renderOverview).toHaveBeenCalledWith(
      expect.objectContaining({ conversation, groupedAttachments })
    );
  });

  it("shows the conversation's severity in the header without a live state", async () => {
    const { contract } = createFakeService();
    register(contract);
    await renderDetailsFlyout(contract, 'investigation', { conversation, isOpenedFromChat: false });

    expect(await screen.findByTestId('investigationFlyoutSeverity')).toHaveTextContent('High');
  });

  it('leaves the severity to the live state, passing it the conversation severity', async () => {
    const { contract } = createFakeService();
    register(contract, {
      renderLiveState: ({ conversationId, severity }) => (
        <span>
          live {conversationId} {severity}
        </span>
      ),
    });
    await renderDetailsFlyout(contract, 'investigation', { conversation, isOpenedFromChat: false });

    expect(await screen.findByText('live conversation-1 high')).toBeInTheDocument();
    expect(screen.queryByTestId('investigationFlyoutSeverity')).not.toBeInTheDocument();
  });

  it('renders the header title with renderTitle, passing it the conversation id and title', async () => {
    const { contract } = createFakeService();
    register(contract, {
      loadDetailsFlyoutContext: async () => ({
        useTitle: ({ conversationId, title }) => `title ${conversationId} ${title}`,
      }),
    });

    await renderDetailsFlyout(contract, 'investigation', { conversation, isOpenedFromChat: false });

    expect(
      await screen.findByRole('heading', {
        name: 'title conversation-1 Impossible travel — exec account',
      })
    ).toBeInTheDocument();
  });

  it('registers the brief card when supplied', () => {
    const { contract } = createFakeService();
    const BriefCard = () => <span>card</span>;
    register(contract, { briefCard: BriefCard });

    expect(contract.getTemplateUIDefinition('investigation')?.briefCard).toBe(BriefCard);
  });

  it('registers the template UI definition with a header and footer', () => {
    const { contract } = createFakeService();

    register(contract);

    const definition = contract.getTemplateUIDefinition('investigation');
    expect(definition?.name).toBe('Investigation');
    expect(definition?.icon).toBe('securitySignalDetected');
    expect(definition?.tabs).toEqual(getInvestigationTabIds('investigation'));
    // The header and footer are data, described by the module `load` resolves to.
    expect(definition?.detailsFlyout?.load).toBeDefined();
  });

  it('adds a Copy link flyout action that calls onCopyLink', () => {
    const onCopyLink = jest.fn().mockReturnValue(true);
    const { contract } = createFakeService();
    register(contract, { onCopyLink });

    const getActions =
      contract.getTemplateUIDefinition('investigation')?.detailsFlyout?.trailingActions;
    const [action] = getActions?.({ conversation }) ?? [];

    expect(action).toMatchObject({ iconType: 'link', 'aria-label': 'Copy link' });
    action.onClick?.({} as never);
    expect(onCopyLink).toHaveBeenCalledWith(
      'http://localhost/app/agent_builder/agents/agent/conversations/conversation-1?openConversationDetails=true'
    );
  });

  it('gives each solution its own tab ids, so a second one does not collide', () => {
    const { contract } = createFakeService();

    register(contract);

    // Agent Builder throws on a duplicate tab id, and the package is bundled per plugin, so tab
    // ids have to be derived from the template id rather than shared across solutions.
    expect(() =>
      register(contract, {
        templateId: 'observabilityInvestigation',
        name: 'Observability investigation',
      })
    ).not.toThrow();
    expect(contract.getTemplateUIDefinition('observabilityInvestigation')?.tabs).toEqual(
      getInvestigationTabIds('observabilityInvestigation')
    );
    expect(contract.getTab('observabilityInvestigation.overview')).toBeDefined();
  });

  // The header's title goes through `EuiTextTruncate`, which measures its container and so renders
  // no matchable text under jsdom. These assert on the status/assignee tiles instead, which are
  // plain text; `conversation_to_investigation.test.ts` covers the title mapping itself.
  it("renders the status from the conversation's template metadata", async () => {
    const { contract } = createFakeService();
    register(contract);
    await renderDetailsFlyout(contract, 'investigation', { conversation, isOpenedFromChat: false });

    // Nothing is fetched, so the slot has no loading or error state to pass through first.
    expect(await screen.findByText('open')).toBeInTheDocument();
  });

  it('still renders the header for a conversation carrying no template metadata', async () => {
    const { contract } = createFakeService();
    register(contract);
    await renderDetailsFlyout(contract, 'investigation', {
      conversation: { ...conversation, metadata: undefined },
      isOpenedFromChat: false,
    });

    expect(await screen.findByTestId('headerBlocks')).toHaveTextContent('Status');
    // No assignees → nothing rendered in the assignees tile (no "Unassigned" placeholder).
    expect(screen.queryByText('Unassigned')).not.toBeInTheDocument();
  });

  it('opens the conversation full screen from the footer slot', async () => {
    const { contract, openFullscreenConversation } = createFakeService();
    register(contract);
    await renderDetailsFlyout(contract, 'investigation', { conversation, isOpenedFromChat: false });

    fireEvent.click(await screen.findByTestId('investigationFlyoutOpenChat'));

    // Scoped to the conversation's own agent: the Agent Builder conversation route is per-agent.
    // The conversation list is collapsed so the investigation's chat gets the width.
    expect(openFullscreenConversation).toHaveBeenCalledWith({
      conversationId: 'conversation-1',
      agentId: 'agent',
      openDetails: true,
      collapseSidebar: true,
    });
  });

  it('hides the footer slot Open in chat when the flyout was opened from within chat', async () => {
    const { contract } = createFakeService();
    // The escalation action renders whenever a modal renderer is wired in, which gives a reliable
    // element to await before asserting that Open in chat is absent.
    register(contract, { renderEscalationModal: jest.fn(() => <div>Escalation modal</div>) });

    await renderDetailsFlyout(contract, 'investigation', { conversation, isOpenedFromChat: true });

    await screen.findByText(ACTIONS_TRANSLATIONS.buttons.openEscalation);
    expect(screen.queryByTestId('investigationFlyoutOpenChat')).not.toBeInTheDocument();
  });

  it('calls renderAssignees with the conversation id, templateId, uids, and refetchConversation', async () => {
    const { contract } = createFakeService();
    const renderAssignees: RenderAssignees = jest.fn(() => null);
    register(contract, { renderAssignees });
    const refetchConversation = jest.fn();

    await renderDetailsFlyout(contract, 'investigation', {
      conversation: {
        ...conversation,
        metadata: { assignees: ['uid-1', 'uid-2'], status: 'open' },
      },
      isOpenedFromChat: false,
      refetchConversation,
    });

    await waitFor(() => expect(renderAssignees).toHaveBeenCalled());
    expect(renderAssignees).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation-1',
        templateId: 'investigation',
        assigneeUids: ['uid-1', 'uid-2'],
        status: 'open',
        refetchConversation,
      })
    );
  });

  it('falls back to read-only assignee display when renderAssignees is absent', async () => {
    const { contract } = createFakeService();
    register(contract);
    await renderDetailsFlyout(contract, 'investigation', {
      conversation: { ...conversation, metadata: { assignees: ['uid-1'] } },
      isOpenedFromChat: false,
    });

    // Without a picker the assignees block renders a read-only avatar, not "Unassigned".
    expect(await screen.findByTestId('headerBlocks')).toHaveTextContent('Assignees');
    expect(screen.queryByText('Unassigned')).not.toBeInTheDocument();
  });
});

describe('registerEscalationTemplateUI', () => {
  const escalationConversation: Conversation = {
    id: 'escalation-1',
    agent_id: 'agent',
    user: { username: 'test' },
    title: 'High-severity alert cluster',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    rounds: [],
    template_id: 'escalation',
    metadata: { status: 'open', assignees: ['uid-1'] },
  };

  it('registers the template with an overview tab and a header only (no footer)', () => {
    const { contract } = createFakeService();

    registerEscalationTemplateUI({
      conversationTemplates: contract,
      templateId: 'escalation',
      groupedAttachments: createFlyoutGroupedAttachmentsRegistry(),
      name: 'Escalation',
      onCopyLink: () => true,
    });

    const definition = contract.getTemplateUIDefinition('escalation');
    expect(definition?.tabs).toEqual(['escalation.overview']);
    expect(definition?.detailsFlyout?.load).toBeDefined();
  });

  it('adds a Copy link flyout action that calls onCopyLink', () => {
    const onCopyLink = jest.fn().mockReturnValue(true);
    const { contract } = createFakeService();

    registerEscalationTemplateUI({
      conversationTemplates: contract,
      templateId: 'escalation',
      groupedAttachments: createFlyoutGroupedAttachmentsRegistry(),
      name: 'Escalation',
      onCopyLink,
    });

    const getActions =
      contract.getTemplateUIDefinition('escalation')?.detailsFlyout?.trailingActions;
    const [action] = getActions?.({ conversation: escalationConversation }) ?? [];

    expect(action).toMatchObject({ iconType: 'link', 'aria-label': 'Copy link' });
    action.onClick?.({} as never);
    expect(onCopyLink).toHaveBeenCalledWith(
      'http://localhost/app/agent_builder/agents/agent/conversations/escalation-1?openConversationDetails=true'
    );
  });

  it('calls renderAssignees with templateId "escalation"', async () => {
    const { contract } = createFakeService();
    const renderAssignees: RenderAssignees = jest.fn(() => null);

    registerEscalationTemplateUI({
      conversationTemplates: contract,
      templateId: 'escalation',
      groupedAttachments: createFlyoutGroupedAttachmentsRegistry(),
      name: 'Escalation',
      onCopyLink: () => true,
      renderAssignees,
    });

    const refetchConversation = jest.fn();

    await renderDetailsFlyout(contract, 'escalation', {
      conversation: escalationConversation,
      isOpenedFromChat: false,
      refetchConversation,
    });

    await waitFor(() => expect(renderAssignees).toHaveBeenCalled());
    expect(renderAssignees).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'escalation-1',
        templateId: 'escalation',
        assigneeUids: ['uid-1'],
        status: 'open',
        refetchConversation,
      })
    );
  });

  it('renders the header status from metadata when no renderAssignees is provided', async () => {
    const { contract } = createFakeService();

    registerEscalationTemplateUI({
      conversationTemplates: contract,
      templateId: 'escalation',
      groupedAttachments: createFlyoutGroupedAttachmentsRegistry(),
      name: 'Escalation',
      onCopyLink: () => true,
    });

    await renderDetailsFlyout(contract, 'escalation', {
      conversation: escalationConversation,
      isOpenedFromChat: false,
    });

    expect(await screen.findByText('open')).toBeInTheDocument();
    expect(screen.getByTestId('headerBlocks')).toHaveTextContent('Status');
  });

  it('registers the escalation.overview tab', () => {
    const { contract } = createFakeService();

    registerEscalationTemplateUI({
      conversationTemplates: contract,
      templateId: 'escalation',
      groupedAttachments: createFlyoutGroupedAttachmentsRegistry(),
      name: 'Escalation',
      onCopyLink: () => true,
    });

    const tab = contract.getTab('escalation.overview');
    expect(tab).toBeDefined();
    expect(tab?.label).toBe('Overview');
  });

  it('renders the overview tab and forwards linkedInvestigationIds to renderLinkedInvestigations', async () => {
    const { contract } = createFakeService();
    const renderLinkedInvestigations: RenderLinkedInvestigations = jest.fn(() => null);

    registerEscalationTemplateUI({
      conversationTemplates: contract,
      templateId: 'escalation',
      groupedAttachments: createFlyoutGroupedAttachmentsRegistry(),
      name: 'Escalation',
      onCopyLink: () => true,
      renderLinkedInvestigations,
    });

    const TabContent = contract.getTab('escalation.overview')?.content;
    if (!TabContent) throw new Error('Expected escalation.overview tab');

    const conversationWithLinks: Conversation = {
      ...escalationConversation,
      metadata: { status: 'open', linked_investigations: ['inv-1', 'inv-2'] },
    };

    renderWithKibanaRenderContext(
      <TabContent conversation={conversationWithLinks} isOpenedFromChat={false} />
    );

    await waitFor(() => expect(renderLinkedInvestigations).toHaveBeenCalled());
    expect(renderLinkedInvestigations).toHaveBeenCalledWith(
      expect.objectContaining({
        escalationId: 'escalation-1',
        linkedInvestigationIds: ['inv-1', 'inv-2'],
        onOpenInvestigation: expect.any(Function),
      })
    );
  });

  it('renders the summary and grouped attachments in the overview tab', async () => {
    const { contract } = createFakeService();
    const groupedAttachments = createFlyoutGroupedAttachmentsRegistry();
    groupedAttachments.register(FlyoutGroupedAttachments.ALERTS, ['security.alert'], () => (
      <li>Session cookie replayed</li>
    ));

    registerEscalationTemplateUI({
      conversationTemplates: contract,
      templateId: 'escalation',
      groupedAttachments,
      name: 'Escalation',
      onCopyLink: () => true,
    });

    const TabContent = contract.getTab('escalation.overview')?.content;
    if (!TabContent) throw new Error('Expected escalation.overview tab');

    renderWithKibanaRenderContext(
      <TabContent
        conversation={{
          ...escalationConversation,
          metadata: { status: 'open', summary: 'Escalated narrative' },
          attachments: [
            {
              id: 'attachment-1',
              type: 'security.alert',
              current_version: 1,
              versions: [
                { version: 1, data: {}, created_at: '2024-01-01T00:00:00Z', content_hash: 'a' },
              ],
            },
          ],
        }}
        isOpenedFromChat={false}
      />
    );

    expect(await screen.findByText('Escalated narrative')).toBeInTheDocument();
    expect(screen.getByText('Session cookie replayed')).toBeInTheDocument();
  });

  it('navigates via openFullscreenConversation with openDetails:true when onOpenInvestigation is called', async () => {
    const { contract, openFullscreenConversation } = createFakeService();
    let capturedOnOpen: ((args: { conversationId: string; agentId: string }) => void) | undefined;
    const renderLinkedInvestigations: RenderLinkedInvestigations = jest.fn((props) => {
      capturedOnOpen = props.onOpenInvestigation;
      return null;
    });

    registerEscalationTemplateUI({
      conversationTemplates: contract,
      templateId: 'escalation',
      groupedAttachments: createFlyoutGroupedAttachmentsRegistry(),
      name: 'Escalation',
      onCopyLink: () => true,
      renderLinkedInvestigations,
    });

    const TabContent = contract.getTab('escalation.overview')?.content;
    if (!TabContent) throw new Error('Expected escalation.overview tab');

    renderWithKibanaRenderContext(
      <TabContent conversation={escalationConversation} isOpenedFromChat={false} />
    );

    await waitFor(() => expect(capturedOnOpen).toBeDefined());
    capturedOnOpen!({ conversationId: 'inv-1', agentId: 'agent-42' });

    expect(openFullscreenConversation).toHaveBeenCalledWith({
      conversationId: 'inv-1',
      agentId: 'agent-42',
      openDetails: true,
    });
  });
});
