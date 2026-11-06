/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, renderHook, screen } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import type { Conversation } from '@kbn/agent-builder-common';
import type { ConversationTemplateDetailsFlyoutDescriptor } from '@kbn/agent-builder-browser';
import {
  createInvestigationDetailsFlyoutModule,
  useEscalationDetailsFlyout,
  useInvestigationDetailsFlyout,
  type InvestigationDetailsFlyoutOptions,
} from './details_flyout';
import { ACTIONS_TRANSLATIONS } from '../components/actions/translations';

const OPEN_ESCALATION = ACTIONS_TRANSLATIONS.buttons.openEscalation;

const conversation = (overrides: Partial<Conversation> = {}) =>
  ({
    id: 'investigation-1',
    agent_id: 'agent-1',
    title: 'Checkout errors',
    template_id: 'investigation',
    created_at: '2026-09-01T10:00:00.000Z',
    metadata: { status: 'open', severity: 'high' },
    ...overrides,
  } as unknown as Conversation);

const baseOptions: InvestigationDetailsFlyoutOptions = { onOpenChat: jest.fn() };

const renderInvestigation = (
  options: Partial<InvestigationDetailsFlyoutOptions> = {},
  { isOpenedFromChat = false, overrides = {} } = {}
) =>
  renderHook(() =>
    useInvestigationDetailsFlyout(
      { conversation: conversation(overrides), isOpenedFromChat },
      { ...baseOptions, ...options }
    )
  ).result.current;

/** Renders a descriptor's header blocks, which hold the render props' output. */
const renderBlocks = ({ header }: ConversationTemplateDetailsFlyoutDescriptor) =>
  renderWithKibanaRenderContext(
    <>
      {header.infoBlocks?.map(({ id, title, children }) => (
        <div key={id} data-test-subj={`block-${id}`}>
          {title}
          {children}
        </div>
      ))}
    </>
  );

/**
 * Renders a module the way Agent Builder does: the descriptor inside the module's `Provider`, with
 * the footer actions as buttons.
 */
const renderModule = (options: Partial<InvestigationDetailsFlyoutOptions>) => {
  const { Provider, useDetailsFlyout } = createInvestigationDetailsFlyoutModule({
    ...baseOptions,
    ...options,
  });
  const Flyout = () => {
    const { footer } = useDetailsFlyout({ conversation: conversation(), isOpenedFromChat: false });
    return (
      <>
        {footer?.primary && (
          <button onClick={footer.primary.onClick}>{footer.primary.label}</button>
        )}
      </>
    );
  };
  if (!Provider) throw new Error('Expected a Provider');
  return renderWithKibanaRenderContext(
    <Provider>
      <Flyout />
    </Provider>
  );
};

describe('useInvestigationDetailsFlyout', () => {
  it('renders the severity picker for an investigation with a severity', () => {
    const renderSeverity = jest.fn(() => <div>Severity picker</div>);
    renderBlocks(renderInvestigation({ renderSeverity }));

    expect(screen.getByText('Severity picker')).toBeInTheDocument();
    expect(renderSeverity).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: 'investigation-1', severity: 'high' })
    );
  });

  it('leaves the severity out for an investigation without one', () => {
    const renderSeverity = jest.fn(() => <div>Severity picker</div>);
    renderBlocks(
      renderInvestigation({ renderSeverity }, { overrides: { metadata: { status: 'open' } } })
    );

    expect(renderSeverity).not.toHaveBeenCalled();
    expect(screen.queryByTestId('block-severity')).not.toBeInTheDocument();
  });

  it("titles the header with the context's useTitle, as plain text", () => {
    const useTitle = jest.fn(({ title }) => `Named ${title}`);
    const { header } = renderInvestigation({ context: { useTitle } });

    expect(header.title).toBe('Named Checkout errors');
    expect(useTitle).toHaveBeenCalledWith({
      conversationId: 'investigation-1',
      title: 'Checkout errors',
    });
  });

  it("titles the header with the conversation's title without useTitle", () => {
    expect(renderInvestigation().header.title).toBe('Checkout errors');
  });

  it('shows the severity as a header badge without a live state or severity picker', () => {
    expect(renderInvestigation().header.badges).toEqual([
      expect.objectContaining({
        children: 'High',
        'data-test-subj': 'investigationFlyoutSeverity',
      }),
    ]);
    expect(renderInvestigation({ renderLiveState: () => <span>live</span> }).header.badges).toEqual(
      []
    );
  });

  it('offers Open chat, with AI styling, only outside the chat', () => {
    const onOpenChat = jest.fn();
    const { footer } = renderInvestigation({ onOpenChat });

    expect(footer?.secondary).toMatchObject({
      variant: 'ai',
      iconType: 'productAgent',
      'data-test-subj': 'investigationFlyoutOpenChat',
    });
    footer?.secondary?.onClick({} as never);
    expect(onOpenChat).toHaveBeenCalledWith({
      conversationId: 'investigation-1',
      agentId: 'agent-1',
    });

    expect(renderInvestigation({}, { isOpenedFromChat: true }).footer?.secondary).toBeUndefined();
  });

  it('offers no escalation without a modal renderer', () => {
    expect(renderInvestigation().footer?.primary).toBeUndefined();
  });

  it('opens the escalation modal from the footer action, and closes it', () => {
    const renderEscalationModal = jest.fn(({ mode, onClose }) => (
      <div>
        Escalation modal {mode}
        <button onClick={onClose}>Close modal</button>
      </div>
    ));
    renderModule({ renderEscalationModal });

    expect(screen.queryByText('Escalation modal create')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: OPEN_ESCALATION }));

    expect(screen.getByText('Escalation modal create')).toBeInTheDocument();
    expect(renderEscalationModal).toHaveBeenLastCalledWith(
      expect.objectContaining({
        investigation: expect.objectContaining({ title: 'Checkout errors' }),
      })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close modal' }));

    expect(screen.queryByText('Escalation modal create')).not.toBeInTheDocument();
  });

  it('hides Open an escalation from a user who may not escalate, inside the plugin Provider', () => {
    const PluginContext = React.createContext(false);
    renderModule({
      renderEscalationModal: () => null,
      context: {
        Provider: ({ children }) => (
          <PluginContext.Provider value={false}>{children}</PluginContext.Provider>
        ),
        useCanOpenEscalation: () => React.useContext(PluginContext),
      },
    });

    expect(screen.queryByRole('button', { name: OPEN_ESCALATION })).not.toBeInTheDocument();
  });

  it('shows "None" for assignees without renderAssignees or any assignee', () => {
    renderBlocks(renderInvestigation());

    expect(screen.getByTestId('block-assignees')).toHaveTextContent('None');
  });

  it('falls back to a read-only status badge without renderStatus', () => {
    renderBlocks(renderInvestigation());

    expect(screen.getByTestId('block-status')).toHaveTextContent('open');
  });
});

describe('useEscalationDetailsFlyout', () => {
  const escalation = conversation({
    id: 'escalation-1',
    title: 'High-severity alert cluster',
    template_id: 'escalation',
    metadata: { status: 'open', assignees: ['uid-1'] },
  });

  it('shows the header spinner while the escalation syncs, and has no footer', () => {
    const useEscalationSync = jest.fn(() => true);
    const { result } = renderHook(() =>
      useEscalationDetailsFlyout(
        { conversation: escalation, isOpenedFromChat: false },
        { context: { useEscalationSync } }
      )
    );

    expect(useEscalationSync).toHaveBeenCalledWith('escalation-1');
    expect(result.current.header.isLoading).toBe(true);
    expect(result.current.header.loadingLabel).toBe(
      'Syncing attachments from linked investigations'
    );
    expect(result.current.footer).toBeUndefined();
  });

  it('passes templateId "escalation" to renderStatus and renderAssignees', () => {
    const renderStatus = jest.fn(() => null);
    const renderAssignees = jest.fn(() => null);
    renderHook(() =>
      useEscalationDetailsFlyout(
        { conversation: escalation, isOpenedFromChat: false },
        { renderStatus, renderAssignees }
      )
    );

    expect(renderStatus).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: 'escalation-1', templateId: 'escalation' })
    );
    expect(renderAssignees).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: 'escalation', assigneeUids: ['uid-1'] })
    );
  });
});
