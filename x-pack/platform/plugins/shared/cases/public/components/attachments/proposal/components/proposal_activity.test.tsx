/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import type { ProposalWithMetadata } from '@kbn/proposals-common';
import { useKibana } from '../../../../common/lib/kibana';
import { useDecideProposal, useGetProposal } from '../api';
import type { ProposalViewProps } from './proposal_activity';
import { ProposalActivity } from './proposal_activity';

jest.mock('../../../../common/lib/kibana');
jest.mock('../api');

const useKibanaMock = useKibana as jest.Mock;
const useGetProposalMock = useGetProposal as jest.Mock;
const useDecideProposalMock = useDecideProposal as jest.Mock;

const proposal = {
  id: 'p-1',
  title: 'Tune noisy rule',
  comment: 'Tune the rule that keeps firing.',
  status: 'pending',
  impact: 'low',
  actionInput: { ruleId: 'r-1' },
} as unknown as ProposalWithMetadata;

const props = {
  attachmentId: 'p-1',
  metadata: { title: 'Tune noisy rule', rootProposalId: 'p-1' },
} as ProposalViewProps;

const setUp = ({
  decideProposals,
  data = proposal,
  isError = false,
}: {
  decideProposals: boolean;
  data?: ProposalWithMetadata;
  isError?: boolean;
}) => {
  useKibanaMock.mockReturnValue({
    services: {
      http: { basePath: { prepend: (path: string) => path } },
      application: { capabilities: { proposals: { showProposals: true, decideProposals } } },
    },
  });
  useGetProposalMock.mockReturnValue({
    data: isError ? undefined : data,
    isLoading: false,
    isError,
  });
  const approve = { mutateAsync: jest.fn().mockResolvedValue({}), isLoading: false };
  const dismiss = { mutateAsync: jest.fn().mockResolvedValue({}), isLoading: false };
  useDecideProposalMock.mockReturnValue({ approve, dismiss });
  return { approve, dismiss };
};

describe('ProposalActivity', () => {
  afterEach(() => jest.clearAllMocks());

  it('approves with the action input the viewer was shown', async () => {
    const { approve } = setUp({ decideProposals: true });

    renderWithKibanaRenderContext(<ProposalActivity {...props} />);
    fireEvent.click(screen.getByText('Approve'));

    await waitFor(() =>
      expect(approve.mutateAsync).toHaveBeenCalledWith({ actionInput: { ruleId: 'r-1' } })
    );
  });

  it('offers no decision without the decide capability', () => {
    setUp({ decideProposals: false });

    renderWithKibanaRenderContext(<ProposalActivity {...props} />);

    expect(screen.queryByText('Approve')).not.toBeInTheDocument();
    expect(screen.getByText('Tune noisy rule')).toBeInTheDocument();
  });

  it('offers no decision on a proposal that was already decided', () => {
    setUp({
      decideProposals: true,
      data: { ...proposal, decision: 'dismissed', status: 'no_action' } as ProposalWithMetadata,
    });

    renderWithKibanaRenderContext(<ProposalActivity {...props} />);

    expect(screen.queryByText('Approve')).not.toBeInTheDocument();
  });

  it('says a replaced proposal was replaced, and offers no decision on it', () => {
    setUp({
      decideProposals: true,
      data: { ...proposal, status: 'superseded', supersededBy: 'p-2' } as ProposalWithMetadata,
    });

    renderWithKibanaRenderContext(<ProposalActivity {...props} />);

    expect(screen.getByTestId('proposal-activity-replaced-p-1')).toHaveTextContent(
      'This proposal has been replaced.'
    );
    expect(screen.queryByText('Approve')).not.toBeInTheDocument();
  });

  it('falls back to the stored title when the proposal cannot be read', () => {
    setUp({ decideProposals: true, isError: true });

    renderWithKibanaRenderContext(<ProposalActivity {...props} />);

    expect(screen.getByTestId('proposal-activity-unavailable-p-1')).toHaveTextContent(
      'Tune noisy rule'
    );
  });
});
