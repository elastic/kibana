/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { Conversation } from '@kbn/agent-builder-common';
import type {
  AttachmentServiceStartContract,
  ConversationTemplateServiceStartContract,
  ConversationTemplateTabDefinition,
  ConversationTemplateUIContext,
  ConversationTemplateUIDefinition,
} from '@kbn/agent-builder-browser';
import type { Investigation } from '../types';
import { registerAgenticInvestigationTemplateUI } from './register';
import {
  AGENTIC_INVESTIGATIONS_ATTACHMENTS_TAB_ID,
  AGENTIC_INVESTIGATIONS_OVERVIEW_TAB_ID,
  AGENTIC_INVESTIGATIONS_TIMELINE_TAB_ID,
} from './constants';

/** Mirrors what Agent Builder mounts the flyout with (`toMountPoint` + `core.rendering`). */
const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <I18nProvider>
    <EuiProvider>{children}</EuiProvider>
  </I18nProvider>
);

const investigation: Investigation = {
  id: 'conversation-1',
  template_id: 'investigation',
  title: 'Impossible travel — exec account',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  watch_id: 'watch-1',
  watch_execution_id: 'exec-1',
  status: 'open',
  severity: 'high',
  affectedSurface: 'cfo@corp',
  summary: 'A second sign-in replayed the same session cookie.',
  pendingProposalCount: 0,
  events: [],
};

const conversation: Conversation = {
  id: 'conversation-1',
  agent_id: 'agent',
  user: { username: 'test' },
  title: 'Impossible travel — exec account',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  rounds: [],
  template_id: 'investigation',
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
  const openSidebarConversation = jest.fn();
  const context: ConversationTemplateUIContext = {
    attachmentsService,
    openSidebarConversation,
    openFullscreenConversation: jest.fn(),
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

  return { contract, openSidebarConversation };
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
    loadInvestigation: jest.fn().mockResolvedValue(investigation),
    ...overrides,
  });

describe('registerAgenticInvestigationTemplateUI', () => {
  it('registers the overview, attachments and timeline tabs', () => {
    const { contract } = createFakeService();

    register(contract);

    expect(contract.getTab(AGENTIC_INVESTIGATIONS_OVERVIEW_TAB_ID)?.label).toBe('Overview');
    expect(contract.getTab(AGENTIC_INVESTIGATIONS_ATTACHMENTS_TAB_ID)?.label).toBe('Attachments');
    expect(contract.getTab(AGENTIC_INVESTIGATIONS_TIMELINE_TAB_ID)?.label).toBe('Timeline');
  });

  it('registers the template UI definition with a header and footer', () => {
    const { contract } = createFakeService();

    register(contract);

    const definition = contract.getTemplateUIDefinition('investigation');
    expect(definition?.name).toBe('Investigation');
    expect(definition?.icon).toBe('securitySignalDetected');
    expect(definition?.tabs).toEqual([
      AGENTIC_INVESTIGATIONS_OVERVIEW_TAB_ID,
      AGENTIC_INVESTIGATIONS_ATTACHMENTS_TAB_ID,
      AGENTIC_INVESTIGATIONS_TIMELINE_TAB_ID,
    ]);
    expect(definition?.detailsFlyout?.header).toBeDefined();
    expect(definition?.detailsFlyout?.footer).toBeDefined();
  });

  it('does not re-register the shared tabs when a second solution registers a template', () => {
    const { contract } = createFakeService();

    register(contract);

    // Agent Builder throws on a duplicate tab id, so this would fail without the guard.
    expect(() =>
      register(contract, {
        templateId: 'observabilityInvestigation',
        name: 'Observability investigation',
      })
    ).not.toThrow();
    expect(contract.getTemplateUIDefinition('observabilityInvestigation')?.name).toBe(
      'Observability investigation'
    );
  });

  it('renders the investigation title and status in the header slot', async () => {
    const { contract } = createFakeService();
    register(contract);
    const Header = getSlot(contract, 'investigation', 'header');

    render(<Header conversation={conversation} isOpenedFromChat={false} />, { wrapper });

    expect(await screen.findByText('Impossible travel — exec account')).toBeInTheDocument();
    expect(screen.getByText('open')).toBeInTheDocument();
  });

  it('falls back to the conversation title when the investigation cannot be loaded', async () => {
    const { contract } = createFakeService();
    register(contract, {
      templateId: 'failing',
      loadInvestigation: jest.fn().mockRejectedValue(new Error('boom')),
    });
    const Header = getSlot(contract, 'failing', 'header');

    render(
      <Header
        conversation={{ ...conversation, template_id: 'failing' }}
        isOpenedFromChat={false}
      />,
      { wrapper }
    );

    // Agent Builder points the flyout's `aria-labelledby` at the header, so it must not be empty.
    expect(await screen.findByText('Impossible travel — exec account')).toBeInTheDocument();
  });

  it('opens the sidebar conversation from the footer slot', async () => {
    const { contract, openSidebarConversation } = createFakeService();
    register(contract);
    const Footer = getSlot(contract, 'investigation', 'footer');

    render(<Footer conversation={conversation} isOpenedFromChat={false} />, { wrapper });

    fireEvent.click(await screen.findByTestId('investigationFlyoutOpenChat'));

    expect(openSidebarConversation).toHaveBeenCalledWith('conversation-1');
  });
});
