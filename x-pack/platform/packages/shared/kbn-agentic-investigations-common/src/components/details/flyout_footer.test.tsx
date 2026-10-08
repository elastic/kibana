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
  updatedAt: '2024-01-01T00:00:00Z',
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
});
