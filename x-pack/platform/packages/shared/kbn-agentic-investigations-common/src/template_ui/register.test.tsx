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
import type { RenderAssignees } from './types';

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
  const context: ConversationTemplateUIContext = {
    attachmentsService,
    openSidebarConversation: jest.fn(),
    openFullscreenConversation,
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

/** Reads a registered flyout slot, failing the test rather than rendering `undefined`. */
const getSlot = (
  contract: ConversationTemplateServiceStartContract,
  templateId: string,
  slot: 'header' | 'footer'
) => {
  const Slot = contract.getTemplateUIDefinition(templateId)?.detailsFlyout?.[slot];
  if (!Slot) {
    throw new Error(`Expected a registered ${slot} for template [${templateId}]`);
  }
  return Slot;
};

const register = (
  contract: ConversationTemplateServiceStartContract,
  overrides: Partial<Parameters<typeof registerAgenticInvestigationTemplateUI>[0]> = {}
) =>
  registerAgenticInvestigationTemplateUI({
    conversationTemplates: contract,
    templateId: 'investigation',
    name: 'Investigation',
    icon: 'securitySignalDetected',
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

  it('registers the template UI definition with a header and footer', () => {
    const { contract } = createFakeService();

    register(contract);

    const definition = contract.getTemplateUIDefinition('investigation');
    expect(definition?.name).toBe('Investigation');
    expect(definition?.icon).toBe('securitySignalDetected');
    expect(definition?.tabs).toEqual(getInvestigationTabIds('investigation'));
    expect(definition?.detailsFlyout?.header).toBeDefined();
    expect(definition?.detailsFlyout?.footer).toBeDefined();
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
    const Header = getSlot(contract, 'investigation', 'header');

    renderWithKibanaRenderContext(<Header conversation={conversation} isOpenedFromChat={false} />);

    // Nothing is fetched, so the slot has no loading or error state to pass through first.
    expect(await screen.findByText('open')).toBeInTheDocument();
  });

  it('still renders the header for a conversation carrying no template metadata', async () => {
    const { contract } = createFakeService();
    register(contract);
    const Header = getSlot(contract, 'investigation', 'header');

    renderWithKibanaRenderContext(
      <Header conversation={{ ...conversation, metadata: undefined }} isOpenedFromChat={false} />
    );

    // Agent Builder points the flyout's `aria-labelledby` at the header, so it must still render.
    expect(await screen.findByTestId('investigationHeaderBlocks')).toBeInTheDocument();
    // No assignees → nothing rendered in the assignees tile (no "Unassigned" placeholder).
    expect(screen.queryByText('Unassigned')).not.toBeInTheDocument();
  });

  it('opens the conversation full screen from the footer slot', async () => {
    const { contract, openFullscreenConversation } = createFakeService();
    register(contract);
    const Footer = getSlot(contract, 'investigation', 'footer');

    renderWithKibanaRenderContext(<Footer conversation={conversation} isOpenedFromChat={false} />);

    fireEvent.click(await screen.findByTestId('investigationFlyoutOpenChat'));

    // Scoped to the conversation's own agent: the Agent Builder conversation route is per-agent.
    expect(openFullscreenConversation).toHaveBeenCalledWith({
      conversationId: 'conversation-1',
      agentId: 'agent',
      openDetails: true,
    });
  });

  it('calls renderAssignees with the conversation id, templateId, uids, and refetchConversation', async () => {
    const { contract } = createFakeService();
    const renderAssignees: RenderAssignees = jest.fn(() => null);
    register(contract, { renderAssignees });
    const Header = getSlot(contract, 'investigation', 'header');
    const refetchConversation = jest.fn();

    renderWithKibanaRenderContext(
      <Header
        conversation={{
          ...conversation,
          metadata: { assignees: ['uid-1', 'uid-2'], status: 'open' },
        }}
        isOpenedFromChat={false}
        refetchConversation={refetchConversation}
      />
    );

    // Wait for the lazy chunk to load and the slot to render.
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
    const Header = getSlot(contract, 'investigation', 'header');

    renderWithKibanaRenderContext(
      <Header
        conversation={{ ...conversation, metadata: { assignees: ['uid-1'] } }}
        isOpenedFromChat={false}
      />
    );

    // Without a picker the assignees block renders a read-only avatar, not "Unassigned".
    // EuiAvatar is rendered for the uid — the block should not show "Unassigned".
    expect(await screen.findByTestId('investigationHeaderBlocks')).toBeInTheDocument();
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
      name: 'Escalation',
    });

    const definition = contract.getTemplateUIDefinition('escalation');
    expect(definition?.tabs).toEqual(['escalation.overview']);
    expect(definition?.detailsFlyout?.header).toBeDefined();
    expect(definition?.detailsFlyout?.footer).toBeUndefined();
  });

  it('calls renderAssignees with templateId "escalation"', async () => {
    const { contract } = createFakeService();
    const renderAssignees: RenderAssignees = jest.fn(() => null);

    registerEscalationTemplateUI({
      conversationTemplates: contract,
      templateId: 'escalation',
      name: 'Escalation',
      renderAssignees,
    });

    const Header = contract.getTemplateUIDefinition('escalation')?.detailsFlyout?.header;
    if (!Header) throw new Error('Expected header');
    const refetchConversation = jest.fn();

    renderWithKibanaRenderContext(
      <Header
        conversation={escalationConversation}
        isOpenedFromChat={false}
        refetchConversation={refetchConversation}
      />
    );

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
      name: 'Escalation',
    });

    const Header = contract.getTemplateUIDefinition('escalation')?.detailsFlyout?.header;
    if (!Header) throw new Error('Expected header');

    renderWithKibanaRenderContext(
      <Header conversation={escalationConversation} isOpenedFromChat={false} />
    );

    expect(await screen.findByText('open')).toBeInTheDocument();
    expect(screen.getByTestId('escalationHeaderBlocks')).toBeInTheDocument();
  });
});
