/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { ProposalDecision, ProposalStatus } from '@kbn/proposals-common';
import { useConversationProposals } from '@kbn/proposals-plugin/public';
import { ProposedActionsCount } from './proposed_actions_count';

jest.mock('@kbn/proposals-plugin/public', () => ({
  useConversationProposals: jest.fn(),
}));

const mockUseConversationProposals = useConversationProposals as jest.MockedFunction<
  typeof useConversationProposals
>;

const wrapper = I18nProvider;

const withPages = (
  pages: Array<{
    total: number;
    proposals: Array<{ decision?: ProposalDecision; status?: ProposalStatus }>;
  }>
) => ({ data: { pages } } as unknown as ReturnType<typeof useConversationProposals>);

describe('ProposedActionsCount', () => {
  it('shows the total number of proposals, not just the loaded page', () => {
    mockUseConversationProposals.mockReturnValue(
      withPages([
        { total: 7, proposals: [] },
        { total: 7, proposals: [] },
      ])
    );

    render(<ProposedActionsCount conversationId="conv-1" />, { wrapper });

    expect(screen.getByTestId('investigationFlyoutProposedActionsCount')).toHaveTextContent('7');
    expect(mockUseConversationProposals).toHaveBeenCalledWith('conv-1');
  });

  it('counts decided proposals on the first page and follows data updates', () => {
    mockUseConversationProposals.mockReturnValue(
      withPages([{ total: 3, proposals: [{ decision: 'approved' }, {}, {}] }])
    );
    const { rerender } = render(<ProposedActionsCount conversationId="conv-1" />, { wrapper });
    expect(screen.getByTestId('investigationFlyoutProposedActionsCount')).toHaveTextContent(
      '1 of 3 applied'
    );

    mockUseConversationProposals.mockReturnValue(
      withPages([{ total: 3, proposals: [{ decision: 'approved' }, { decision: 'approved' }, {}] }])
    );
    rerender(<ProposedActionsCount conversationId="conv-1" />);
    expect(screen.getByTestId('investigationFlyoutProposedActionsCount')).toHaveTextContent(
      '2 of 3 applied'
    );
  });

  it('does not count failed proposals as decided', () => {
    mockUseConversationProposals.mockReturnValue(
      withPages([
        {
          total: 3,
          proposals: [
            { decision: 'approved' },
            { decision: 'dismissed' },
            { decision: 'dismissed', status: 'failed' },
          ],
        },
      ])
    );
    render(<ProposedActionsCount conversationId="conv-1" />, { wrapper });
    expect(screen.getByTestId('investigationFlyoutProposedActionsCount')).toHaveTextContent(
      '2 of 3 applied'
    );
  });

  it.each([
    ['still loading', { data: undefined }],
    ['empty', { data: { pages: [{ total: 0, proposals: [] }] } }],
    [
      'a single proposal',
      { data: { pages: [{ total: 1, proposals: [{ decision: 'approved' }] }] } },
    ],
    ['failed to load', { data: undefined, isError: true }],
  ])('renders nothing when %s', (_state, result) => {
    mockUseConversationProposals.mockReturnValue(
      result as unknown as ReturnType<typeof useConversationProposals>
    );

    const { container } = render(<ProposedActionsCount conversationId="conv-1" />, { wrapper });

    expect(container).toBeEmptyDOMElement();
  });
});
