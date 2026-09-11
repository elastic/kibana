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
import type { Investigation } from '../../types';
import { ConversationDetailsFlyoutFooter } from './flyout_footer';

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <I18nProvider>
    <EuiProvider>{children}</EuiProvider>
  </I18nProvider>
);

const investigation: Investigation = {
  id: 'inv-1',
  template_id: 'investigation',
  title: 'Impossible travel',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  watch_id: 'watch-1',
  watch_execution_id: 'exec-1',
  recordId: 'CASE-2047',
  assignee: 'ava',
  pendingProposalCount: 0,
  events: [],
};

const openActionsMenu = () => {
  fireEvent.click(screen.getByTestId('investigationFlyoutActions-button'));
};

describe('ConversationDetailsFlyoutFooter', () => {
  it('calls the supplied onOpenChat rather than reaching for Kibana services', () => {
    const onOpenChat = jest.fn();

    render(
      <ConversationDetailsFlyoutFooter investigation={investigation} onOpenChat={onOpenChat} />,
      {
        wrapper,
      }
    );

    fireEvent.click(screen.getByTestId('investigationFlyoutOpenChat'));

    expect(onOpenChat).toHaveBeenCalledTimes(1);
  });

  it('owns the assign modal, so it opens without a page-level host', () => {
    render(
      <ConversationDetailsFlyoutFooter investigation={investigation} onOpenChat={jest.fn()} />,
      { wrapper }
    );

    openActionsMenu();
    fireEvent.click(screen.getByText('Assign'));

    expect(screen.getByText('Assign proposal')).toBeInTheDocument();
  });

  it('owns the dismiss modal', () => {
    render(
      <ConversationDetailsFlyoutFooter investigation={investigation} onOpenChat={jest.fn()} />,
      { wrapper }
    );

    openActionsMenu();
    fireEvent.click(screen.getByText('Dismiss'));

    expect(screen.getByText('Dismiss proposal')).toBeInTheDocument();
  });
});
