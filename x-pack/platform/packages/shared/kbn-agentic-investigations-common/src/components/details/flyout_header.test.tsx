/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import type { Investigation } from '../../types';
import { ConversationDetailsFlyoutHeader } from './flyout_header';

const investigation: Investigation = {
  id: 'inv-1',
  template_id: 'investigation',
  title: 'Suspicious login',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  worker_execution_ids: ['exec-1'],
  recordId: 'CASE-1',
  assignee: undefined,
  pendingProposalCount: 0,
  assignees: [],
  events: [],
  status: 'open',
};

describe('ConversationDetailsFlyoutHeader', () => {
  it('renders the investigation title', () => {
    renderWithKibanaRenderContext(
      <ConversationDetailsFlyoutHeader investigation={investigation} />
    );
    expect(screen.getByText('Suspicious login')).toBeInTheDocument();
  });

  it('renders a custom statusNode when provided', () => {
    renderWithKibanaRenderContext(
      <ConversationDetailsFlyoutHeader
        investigation={investigation}
        statusNode={<button>Toggle status</button>}
      />
    );
    expect(screen.getByRole('button', { name: 'Toggle status' })).toBeInTheDocument();
  });

  it('falls back to a read-only status badge when statusNode is absent', () => {
    renderWithKibanaRenderContext(
      <ConversationDetailsFlyoutHeader investigation={{ ...investigation, status: 'open' }} />
    );
    expect(screen.getByText('open')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /toggle/i })).not.toBeInTheDocument();
  });

  it('renders a custom assigneesNode when provided', () => {
    renderWithKibanaRenderContext(
      <ConversationDetailsFlyoutHeader
        investigation={investigation}
        assigneesNode={<span>Assignee picker</span>}
      />
    );
    expect(screen.getByText('Assignee picker')).toBeInTheDocument();
  });
});
