/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import type { Investigation } from '../../types';
import { ACTIONS_TRANSLATIONS } from '../actions/translations';
import { ConversationDetailsFlyoutFooter } from './flyout_footer';

const investigation: Investigation = {
  id: 'inv-1',
  template_id: 'investigation',
  title: 'Impossible travel',
  createdAt: '2024-01-01T00:00:00Z',
  worker_execution_ids: ['exec-1'],
  recordId: 'CASE-2047',
  assignee: 'ava',
  pendingProposalCount: 0,
  assignees: [],
  events: [],
};

const openEscalationButtonName = ACTIONS_TRANSLATIONS.buttons.openEscalation;

describe('ConversationDetailsFlyoutFooter', () => {
  it('calls the supplied onOpenChat rather than reaching for Kibana services', () => {
    const onOpenChat = jest.fn();

    renderWithKibanaRenderContext(
      <ConversationDetailsFlyoutFooter
        investigation={investigation}
        isOpenedFromChat={false}
        onOpenChat={onOpenChat}
      />
    );

    fireEvent.click(screen.getByTestId('investigationFlyoutOpenChat'));

    expect(onOpenChat).toHaveBeenCalledTimes(1);
  });

  it('hides Open in chat when the flyout was opened from within chat, which is already there', () => {
    renderWithKibanaRenderContext(
      <ConversationDetailsFlyoutFooter
        investigation={investigation}
        isOpenedFromChat
        onOpenChat={jest.fn()}
      />
    );

    expect(screen.queryByTestId('investigationFlyoutOpenChat')).not.toBeInTheDocument();
  });

  it('opens the escalation modal via onOpenEscalation when the button is clicked', () => {
    const onOpenEscalation = jest.fn(() => <div>Escalation modal</div>);

    renderWithKibanaRenderContext(
      <ConversationDetailsFlyoutFooter
        investigation={investigation}
        isOpenedFromChat={false}
        onOpenChat={jest.fn()}
        onOpenEscalation={onOpenEscalation}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: openEscalationButtonName }));

    expect(onOpenEscalation).toHaveBeenCalledTimes(1);
    expect(onOpenEscalation).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'create', investigation, onClose: expect.any(Function) })
    );
    expect(screen.getByText('Escalation modal')).toBeInTheDocument();
  });

  it('omits the escalation button when onOpenEscalation is not supplied', () => {
    renderWithKibanaRenderContext(
      <ConversationDetailsFlyoutFooter
        investigation={investigation}
        isOpenedFromChat={false}
        onOpenChat={jest.fn()}
        onCloseInvestigation={() => <div>Dismiss proposal</div>}
      />
    );

    expect(
      screen.queryByRole('button', { name: openEscalationButtonName })
    ).not.toBeInTheDocument();
  });

  it('lets wrapEscalationButton hide the escalation button', () => {
    renderWithKibanaRenderContext(
      <ConversationDetailsFlyoutFooter
        investigation={investigation}
        isOpenedFromChat={false}
        onOpenChat={jest.fn()}
        onOpenEscalation={jest.fn(() => null)}
        wrapEscalationButton={() => null}
      />
    );

    expect(
      screen.queryByRole('button', { name: openEscalationButtonName })
    ).not.toBeInTheDocument();
  });

  it('renders the escalation button through wrapEscalationButton', () => {
    renderWithKibanaRenderContext(
      <ConversationDetailsFlyoutFooter
        investigation={investigation}
        isOpenedFromChat={false}
        onOpenChat={jest.fn()}
        onOpenEscalation={jest.fn(() => null)}
        wrapEscalationButton={(button) => <div data-test-subj="escalationButtonGate">{button}</div>}
      />
    );

    expect(screen.getByTestId('escalationButtonGate')).toContainElement(
      screen.getByRole('button', { name: openEscalationButtonName })
    );
  });

  it('offers Delete then Close in the Actions menu for an open investigation', () => {
    renderWithKibanaRenderContext(
      <ConversationDetailsFlyoutFooter
        investigation={investigation}
        isOpenedFromChat={false}
        onOpenChat={jest.fn()}
        onCloseInvestigation={() => <div>Close modal</div>}
        onDeleteInvestigation={() => <div>Delete modal</div>}
      />
    );

    fireEvent.click(screen.getByTestId('investigationFlyoutActionsButton'));
    const deleteItem = screen.getByTestId('investigationFlyoutActionsDelete');
    const closeItem = screen.getByTestId('investigationFlyoutActionsClose');
    expect(deleteItem).toHaveTextContent(ACTIONS_TRANSLATIONS.buttons.deleteInvestigation);
    expect(closeItem).toHaveTextContent(ACTIONS_TRANSLATIONS.buttons.closeShort);
    // Delete is first, with a divider before Close.
    const panel = screen.getByTestId('investigationFlyoutActionsPanel');
    const actionButtons = Array.from(panel.querySelectorAll('button'));
    expect(actionButtons.map((button) => button.getAttribute('data-test-subj'))).toEqual([
      'investigationFlyoutActionsDelete',
      'investigationFlyoutActionsClose',
    ]);
    expect(deleteItem.compareDocumentPosition(closeItem) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(panel.querySelector('hr')).toBeInTheDocument();
  });

  it('offers Delete then Open in the Actions menu for a closed investigation', () => {
    const onReopenInvestigation = jest.fn();
    renderWithKibanaRenderContext(
      <ConversationDetailsFlyoutFooter
        investigation={{ ...investigation, status: 'closed' }}
        isOpenedFromChat={false}
        onOpenChat={jest.fn()}
        onCloseInvestigation={() => null}
        onReopenInvestigation={onReopenInvestigation}
        onDeleteInvestigation={() => <div>Delete modal</div>}
      />
    );

    fireEvent.click(screen.getByTestId('investigationFlyoutActionsButton'));
    expect(screen.getByTestId('investigationFlyoutActionsOpen')).toHaveTextContent(
      ACTIONS_TRANSLATIONS.buttons.openShort
    );
    fireEvent.click(screen.getByTestId('investigationFlyoutActionsOpen'));
    expect(onReopenInvestigation).toHaveBeenCalledWith(
      expect.objectContaining({ id: investigation.id, status: 'closed' })
    );
  });

  it('opens the delete confirmation from Actions', () => {
    renderWithKibanaRenderContext(
      <ConversationDetailsFlyoutFooter
        investigation={investigation}
        isOpenedFromChat={false}
        onOpenChat={jest.fn()}
        onDeleteInvestigation={() => <div data-test-subj="deleteModalStub">Delete modal</div>}
      />
    );

    fireEvent.click(screen.getByTestId('investigationFlyoutActionsButton'));
    fireEvent.click(screen.getByTestId('investigationFlyoutActionsDelete'));
    expect(screen.getByTestId('deleteModalStub')).toBeInTheDocument();
  });
});
