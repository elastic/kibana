/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ProposalWithMetadata } from '@kbn/proposals-common';
import type { CaseUI } from '../../../../../common';
import { PROPOSAL_ATTACHMENT_TYPE } from '../../../../../common/constants/attachments';
import { basicCase } from '../../../../containers/mock';
import { renderWithTestingProviders } from '../../../../common/mock';
import { useGetProposalChains } from '../api';
import { useOpenProposalConversation } from './use_open_proposal_conversation';
import { ProposalTabContent } from './proposal_tab_content';

jest.mock('../api');
jest.mock('./use_open_proposal_conversation');

const useGetProposalChainsMock = useGetProposalChains as jest.Mock;
const useOpenProposalConversationMock = useOpenProposalConversation as jest.Mock;

const proposal = (overrides: Partial<ProposalWithMetadata>): ProposalWithMetadata =>
  ({
    id: 'p-1',
    rootProposalId: 'p-1',
    revision: 1,
    title: 'Tune noisy rule',
    status: 'pending',
    impact: 'low',
    createdAt: '2026-11-01T00:00:00.000Z',
    conversationId: 'conv-1',
    ...overrides,
  } as ProposalWithMetadata);

const attachment = (attachmentId: string, rootProposalId = attachmentId) => ({
  type: PROPOSAL_ATTACHMENT_TYPE,
  attachmentId,
  metadata: { title: 'Stored title', rootProposalId },
});

const caseWith = (...comments: Array<ReturnType<typeof attachment>>) =>
  ({ ...basicCase, comments } as unknown as CaseUI);

describe('ProposalTabContent', () => {
  const openConversation = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useOpenProposalConversationMock.mockReturnValue(openConversation);
  });

  it('shows one row per readable proposal and leaves out one it cannot read', () => {
    useGetProposalChainsMock.mockReturnValue({
      data: { proposals: [proposal({})] },
      isInitialLoading: false,
      isError: false,
    });

    renderWithTestingProviders(
      <ProposalTabContent caseData={caseWith(attachment('p-1'), attachment('gone'))} />
    );

    const table = screen.getByTestId('proposal-tab-table');
    expect(within(table).getByTestId('proposal-row-title-p-1')).toHaveTextContent(
      'Tune noisy rule'
    );
    expect(within(table).getAllByRole('row')).toHaveLength(2); // header + one proposal
  });

  it('expands a revised proposal to show its latest revision, which opens its investigation', async () => {
    const original = proposal({ status: 'superseded', supersededBy: 'p-2' });
    const revision = proposal({ id: 'p-2', title: 'Tune noisier rule', revision: 2 });
    useGetProposalChainsMock.mockReturnValue({
      data: { proposals: [revision, original] },
      isInitialLoading: false,
      isError: false,
    });

    renderWithTestingProviders(<ProposalTabContent caseData={caseWith(attachment('p-1'))} />);

    expect(screen.queryByTestId('proposal-row-latest-revision-p-2')).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId('proposal-row-expand-p-1'));

    const latest = screen.getByTestId('proposal-row-latest-revision-p-2');
    expect(latest).toHaveTextContent('Revision 2');
    await userEvent.click(within(latest).getByTestId('proposal-row-title-p-2'));
    expect(openConversation).toHaveBeenCalledWith('conv-1');
  });

  it('offers no expander on a proposal that was not revised', () => {
    useGetProposalChainsMock.mockReturnValue({
      data: { proposals: [proposal({})] },
      isInitialLoading: false,
      isError: false,
    });

    renderWithTestingProviders(<ProposalTabContent caseData={caseWith(attachment('p-1'))} />);

    expect(screen.queryByTestId('proposal-row-expand-p-1')).not.toBeInTheDocument();
  });

  it('removes the attached proposal by its id', async () => {
    const onRemove = jest.fn();
    useGetProposalChainsMock.mockReturnValue({
      data: { proposals: [proposal({})] },
      isInitialLoading: false,
      isError: false,
    });

    renderWithTestingProviders(
      <ProposalTabContent caseData={caseWith(attachment('p-1'))} onRemove={onRemove} />
    );
    await userEvent.click(screen.getByTestId('proposal-row-remove-p-1'));

    expect(onRemove).toHaveBeenCalledWith({ attachmentIds: ['p-1'] });
  });

  it('shows an error when the proposals cannot be loaded', () => {
    useGetProposalChainsMock.mockReturnValue({
      data: undefined,
      isInitialLoading: false,
      isError: true,
    });

    renderWithTestingProviders(<ProposalTabContent caseData={caseWith(attachment('p-1'))} />);

    expect(screen.getByTestId('proposal-tab-error')).toHaveTextContent(
      'Refresh the page to try again.'
    );
  });

  it('says why the table is empty: no search match, or nothing readable', () => {
    useGetProposalChainsMock.mockReturnValue({
      data: { proposals: [proposal({})] },
      isInitialLoading: false,
      isError: false,
    });
    const { rerender } = renderWithTestingProviders(
      <ProposalTabContent caseData={caseWith(attachment('p-1'))} searchTerm="isolate" />
    );
    expect(screen.getByText('No proposals match your search.')).toBeInTheDocument();

    rerender(<ProposalTabContent caseData={caseWith(attachment('gone'))} />);
    expect(screen.getByText(/proposals can't be shown/)).toBeInTheDocument();
  });
});
