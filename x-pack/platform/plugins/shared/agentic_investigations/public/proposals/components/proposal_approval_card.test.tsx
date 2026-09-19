/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { ProposalApprovalCard } from './proposal_approval_card';
import { useProposal, useApproveProposal, useDismissProposal } from '../hooks/use_proposals_api';
import type { ProposalWithMetadata } from '../../../common';

// ── Mock heavy external deps ──────────────────────────────────────────────────

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useEuiTheme: () => ({ euiTheme: { size: { m: '16px', s: '8px' } } }),
  EuiLoadingSpinner: ({ size }: { size: string }) => (
    <div data-test-subj="loading-spinner" data-size={size} />
  ),
  EuiSpacer: () => <div />,
}));

jest.mock('@kbn/ui-callout', () => ({
  KbnDangerCallout: ({ title }: { title: string }) => (
    <div data-test-subj="danger-callout">{title}</div>
  ),
  KbnWarningCallout: ({ title }: { title: string }) => (
    <div data-test-subj="warning-callout">{title}</div>
  ),
  KbnInfoCallout: ({ title }: { title: string }) => (
    <div data-test-subj="info-callout">{title}</div>
  ),
}));

jest.mock('@kbn/agentic-investigations-common', () => ({
  ApprovalContent: ({
    children,
    primaryAction,
    secondaryActions,
    tone,
    blastRadius,
  }: {
    children?: React.ReactNode;
    tone?: string;
    blastRadius?: { variant: string; items: Array<{ id: string; text?: string }> };
    primaryAction?: {
      label: string;
      onClick: () => void;
      isDisabled?: boolean;
      'data-test-subj'?: string;
    };
    secondaryActions?: Array<{
      label: string;
      onClick: () => void;
      isDisabled?: boolean;
      'data-test-subj'?: string;
    }>;
  }) => (
    <div data-test-subj="approval-content" data-tone={tone}>
      {primaryAction && (
        <button
          onClick={primaryAction.onClick}
          disabled={primaryAction.isDisabled}
          data-test-subj={primaryAction['data-test-subj']}
        >
          {primaryAction.label}
        </button>
      )}
      {secondaryActions?.map((a) => (
        <button
          key={a.label}
          onClick={a.onClick}
          disabled={a.isDisabled}
          data-test-subj={a['data-test-subj']}
        >
          {a.label}
        </button>
      ))}
      {/* Surfaced so the tone and the blast-radius rows are observable: the real
          component renders them as props rather than as children. */}
      {blastRadius?.items?.map((item) => (
        <div key={item.id} data-test-subj={`blast-radius-${item.id}`}>
          {item.text}
        </div>
      ))}
      {children}
    </div>
  ),
}));

jest.mock('@kbn/core-http-browser', () => ({
  isHttpFetchError: (e: unknown) => {
    return (e as { _isHttpFetchError?: boolean })?._isHttpFetchError === true;
  },
}));

jest.mock('../hooks/use_proposals_api', () => ({
  useProposal: jest.fn(),
  useApproveProposal: jest.fn(),
  useDismissProposal: jest.fn(),
}));

jest.mock('./proposal_dismiss_form', () => ({
  ProposalDismissForm: ({
    'data-test-subj': testSubj,
    onRationaleChange,
  }: {
    'data-test-subj'?: string;
    onRationaleChange: (v: string) => void;
    dismissReason: string;
    rationale: string;
    onDismissReasonChange: (r: string) => void;
  }) => (
    <div data-test-subj={testSubj ?? 'dismiss-form'}>
      <input data-test-subj="rationale-input" onChange={(e) => onRationaleChange(e.target.value)} />
    </div>
  ),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const useProposalMock = useProposal as jest.MockedFunction<typeof useProposal>;
const useApproveProposalMock = useApproveProposal as jest.MockedFunction<typeof useApproveProposal>;
const useDismissProposalMock = useDismissProposal as jest.MockedFunction<typeof useDismissProposal>;

const baseProposal = (overrides: Partial<ProposalWithMetadata> = {}): ProposalWithMetadata => ({
  id: 'proposal-1',
  spaceId: 'default',
  conversationId: 'conv-1',
  comment: 'Tune the noisy rule',
  status: 'pending',
  impact: 'low',
  confidence: 'medium',
  origin: 'worker',
  createdAt: '2026-01-01T00:00:00.000Z',
  expired: false,
  ...overrides,
});

const noopMutation = {
  mutateAsync: jest.fn(),
  reset: jest.fn(),
  isLoading: false,
  error: null,
};

const setupMocks = (
  proposalData: ProposalWithMetadata | null = baseProposal(),
  queryState: { isLoading?: boolean; isError?: boolean } = {}
) => {
  useProposalMock.mockReturnValue({
    data: proposalData ?? undefined,
    isLoading: queryState.isLoading ?? false,
    isError: queryState.isError ?? false,
  } as unknown as ReturnType<typeof useProposal>);

  useApproveProposalMock.mockReturnValue({ ...noopMutation } as unknown as ReturnType<
    typeof useApproveProposal
  >);
  useDismissProposalMock.mockReturnValue({ ...noopMutation } as unknown as ReturnType<
    typeof useDismissProposal
  >);
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ProposalApprovalCard', () => {
  const PROPOSAL_ID = 'proposal-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading state', () => {
    it('renders a loading spinner while the query is in flight', () => {
      setupMocks(null, { isLoading: true });
      const { getByTestId } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      expect(getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  describe('error / no-data state', () => {
    it('renders a danger callout when the query errors', () => {
      setupMocks(null, { isError: true });
      const { getByTestId } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      expect(getByTestId('danger-callout')).toBeInTheDocument();
    });

    it('renders a danger callout when query succeeds but returns no data', () => {
      setupMocks(null);
      const { getByTestId } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      expect(getByTestId('danger-callout')).toBeInTheDocument();
    });
  });

  describe('displayed impact', () => {
    it('shows a revised impact rather than the action metadata it replaced', () => {
      // An action-backed proposal whose impact a revision raised.
      setupMocks(
        baseProposal({
          impact: 'high',
          action: { name: 'Isolate host', impact: 'low' },
        })
      );

      const { getByTestId } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);

      expect(getByTestId('approval-content')).toHaveAttribute('data-tone', 'danger');
      expect(getByTestId('blast-radius-impact')).toHaveTextContent('high impact');
    });

    it("falls back to the action's impact when the proposal sets none", () => {
      // The action's value is the default for a proposal that never overrode
      // it, which is the case the old precedence was written for.
      setupMocks(
        baseProposal({
          impact: undefined,
          action: { name: 'Isolate host', impact: 'critical' },
        })
      );

      const { getByTestId } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);

      expect(getByTestId('approval-content')).toHaveAttribute('data-tone', 'danger');
      expect(getByTestId('blast-radius-impact')).toHaveTextContent('critical impact');
    });
  });

  describe('view mode — pending proposal', () => {
    it('renders the card wrapper with the proposal-scoped test id', () => {
      setupMocks();
      const { container } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      expect(
        container.querySelector('[data-test-subj="agenticInvestigationsProposalCard-proposal-1"]')
      ).toBeInTheDocument();
    });

    it('renders the Approve button', () => {
      setupMocks();
      const { container } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      expect(
        container.querySelector(
          '[data-test-subj="agenticInvestigationsProposalApprove-proposal-1"]'
        )
      ).toBeInTheDocument();
    });

    it('renders the Dismiss button', () => {
      setupMocks();
      const { container } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      expect(
        container.querySelector(
          '[data-test-subj="agenticInvestigationsProposalDismiss-proposal-1"]'
        )
      ).toBeInTheDocument();
    });

    it('does not render the dismiss form in view mode', () => {
      setupMocks();
      const { queryByTestId } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      expect(queryByTestId('dismiss-form')).toBeNull();
    });
  });

  describe('expired pending proposal', () => {
    it('renders a warning callout for expired pending proposals', () => {
      setupMocks(baseProposal({ expired: true, status: 'pending' }));
      const { getByTestId } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      expect(getByTestId('warning-callout')).toBeInTheDocument();
    });

    it('disables the Approve button for expired proposals', () => {
      setupMocks(baseProposal({ expired: true, status: 'pending' }));
      const { container } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      const approveBtn = container.querySelector(
        '[data-test-subj="agenticInvestigationsProposalApprove-proposal-1"]'
      ) as HTMLButtonElement;
      expect(approveBtn).toBeDisabled();
    });
  });

  describe('already-decided proposal', () => {
    it('renders an info callout for an approved proposal', () => {
      setupMocks(baseProposal({ decision: 'approved', status: 'executing' }));
      const { getByTestId } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      expect(getByTestId('info-callout')).toBeInTheDocument();
    });

    it('does not render action buttons when proposal is already decided', () => {
      setupMocks(baseProposal({ decision: 'dismissed', status: 'no_action' }));
      const { container } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      expect(
        container.querySelector(
          '[data-test-subj="agenticInvestigationsProposalApprove-proposal-1"]'
        )
      ).toBeNull();
    });

    it('reads the decision rather than the status, which lags behind the gate', () => {
      // An approval stays `pending` until the gate workflow's post-gate steps
      // run, so a card keyed on the status would offer the buttons again to
      // the next person to look at it.
      setupMocks(baseProposal({ decision: 'approved', status: 'pending' }));
      const { getByTestId } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      expect(getByTestId('info-callout')).toBeInTheDocument();
    });

    it('explains an expiry the workflow settled before the deadline', () => {
      // Attempt exhaustion settles `expired` while the computed `expired` flag
      // is still false, and nobody decided — so this is the expiry callout,
      // not the decided one.
      setupMocks(baseProposal({ expired: false, status: 'expired' }));
      const { getByTestId, queryByTestId } = render(
        <ProposalApprovalCard proposalId={PROPOSAL_ID} />
      );
      expect(getByTestId('warning-callout')).toBeInTheDocument();
      expect(queryByTestId('info-callout')).toBeNull();
    });
  });

  describe('superseded row', () => {
    it('renders the revision that replaced it, not the superseded row', () => {
      setupMocks();
      useProposalMock.mockImplementation(
        (id: string | undefined) =>
          ({
            data:
              id === 'proposal-1'
                ? baseProposal({
                    id: 'proposal-1',
                    status: 'superseded',
                    supersededBy: 'proposal-2',
                  })
                : baseProposal({ id: 'proposal-2', revision: 2 }),
            isLoading: false,
            isError: false,
          } as unknown as ReturnType<typeof useProposal>)
      );

      const { container } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);

      expect(useProposalMock).toHaveBeenCalledWith('proposal-2');
      expect(
        container.querySelector(
          '[data-test-subj="agenticInvestigationsProposalApprove-proposal-2"]'
        )
      ).toBeInTheDocument();
      expect(
        container.querySelector('[data-test-subj="agenticInvestigationsProposalCard-proposal-1"]')
      ).toBeNull();
    });

    it('follows the pointer more than one hop', () => {
      setupMocks();
      // A three-link chain: reaching the live head takes two redirects, so a
      // redirect that only ever resolves one level would stop at proposal-2.
      useProposalMock.mockImplementation((id: string | undefined) => {
        const askedFor = id ?? PROPOSAL_ID;
        return {
          data:
            askedFor === 'proposal-1'
              ? baseProposal({ id: askedFor, status: 'superseded', supersededBy: 'proposal-2' })
              : askedFor === 'proposal-2'
              ? baseProposal({ id: askedFor, status: 'superseded', supersededBy: 'proposal-3' })
              : baseProposal({ id: askedFor, revision: 3 }),
          isLoading: false,
          isError: false,
        } as unknown as ReturnType<typeof useProposal>;
      });

      const { container } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);

      expect(useProposalMock).toHaveBeenCalledWith('proposal-3');
      expect(
        container.querySelector(
          '[data-test-subj="agenticInvestigationsProposalApprove-proposal-3"]'
        )
      ).toBeInTheDocument();
    });

    it('stops instead of looping forever on a chain that points in a circle', () => {
      setupMocks();
      useProposalMock.mockImplementation((id: string | undefined) => {
        const askedFor = id ?? PROPOSAL_ID;
        return {
          data: baseProposal({
            id: askedFor,
            status: 'superseded',
            supersededBy: `${askedFor}-next`,
          }),
          isLoading: false,
          isError: false,
        } as unknown as ReturnType<typeof useProposal>;
      });

      const { getByTestId } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);

      expect(getByTestId('warning-callout')).toBeInTheDocument();
    });
  });

  describe('approve flow', () => {
    it('calls approveProposal.mutateAsync when the Approve button is clicked', async () => {
      const mutateAsync = jest.fn().mockResolvedValue({ id: PROPOSAL_ID });
      useApproveProposalMock.mockReturnValue({
        ...noopMutation,
        mutateAsync,
      } as unknown as ReturnType<typeof useApproveProposal>);
      setupMocks();
      // Re-apply approve mock on top of setupMocks
      useApproveProposalMock.mockReturnValue({
        ...noopMutation,
        mutateAsync,
      } as unknown as ReturnType<typeof useApproveProposal>);

      const { container } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      const approveBtn = container.querySelector(
        '[data-test-subj="agenticInvestigationsProposalApprove-proposal-1"]'
      ) as HTMLButtonElement;
      fireEvent.click(approveBtn);

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith({
          id: PROPOSAL_ID,
          body: expect.objectContaining({}),
        });
      });
    });

    it('shows a danger callout for a generic approve error', async () => {
      const mutateAsync = jest.fn().mockRejectedValue(new Error('Network failure'));
      useApproveProposalMock.mockReturnValue({
        ...noopMutation,
        mutateAsync,
        error: new Error('Network failure'),
      } as unknown as ReturnType<typeof useApproveProposal>);

      const { getByTestId } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      expect(getByTestId('danger-callout')).toBeInTheDocument();
    });

    it('shows a warning callout for a 409 conflict error', () => {
      const conflictError = {
        _isHttpFetchError: true,
        response: { status: 409 },
      };
      useApproveProposalMock.mockReturnValue({
        ...noopMutation,
        error: conflictError,
      } as unknown as ReturnType<typeof useApproveProposal>);

      const { getByTestId } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      expect(getByTestId('warning-callout')).toBeInTheDocument();
    });

    it('shows a danger callout for a 410 expired error', () => {
      const expiredError = {
        _isHttpFetchError: true,
        response: { status: 410 },
      };
      useApproveProposalMock.mockReturnValue({
        ...noopMutation,
        error: expiredError,
      } as unknown as ReturnType<typeof useApproveProposal>);

      const { getByTestId } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      expect(getByTestId('danger-callout')).toBeInTheDocument();
    });
  });

  describe('dismiss flow', () => {
    it('switches to dismiss mode when the Dismiss button is clicked', () => {
      setupMocks();
      const { container } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      const dismissBtn = container.querySelector(
        '[data-test-subj="agenticInvestigationsProposalDismiss-proposal-1"]'
      ) as HTMLButtonElement;
      fireEvent.click(dismissBtn);
      expect(
        container.querySelector(
          '[data-test-subj="agenticInvestigationsProposalDismissForm-proposal-1"]'
        )
      ).toBeInTheDocument();
    });

    it('renders the Confirm dismiss and Cancel buttons in dismiss mode', () => {
      setupMocks();
      const { container } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      const dismissBtn = container.querySelector(
        '[data-test-subj="agenticInvestigationsProposalDismiss-proposal-1"]'
      ) as HTMLButtonElement;
      fireEvent.click(dismissBtn);
      expect(
        container.querySelector(
          '[data-test-subj="agenticInvestigationsProposalDismissConfirm-proposal-1"]'
        )
      ).toBeInTheDocument();
      expect(
        container.querySelector(
          '[data-test-subj="agenticInvestigationsProposalDismissCancel-proposal-1"]'
        )
      ).toBeInTheDocument();
    });

    it('returns to view mode when Cancel is clicked', () => {
      setupMocks();
      const { container } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      const dismissBtn = container.querySelector(
        '[data-test-subj="agenticInvestigationsProposalDismiss-proposal-1"]'
      ) as HTMLButtonElement;
      fireEvent.click(dismissBtn);
      const cancelBtn = container.querySelector(
        '[data-test-subj="agenticInvestigationsProposalDismissCancel-proposal-1"]'
      ) as HTMLButtonElement;
      fireEvent.click(cancelBtn);
      expect(
        container.querySelector(
          '[data-test-subj="agenticInvestigationsProposalDismissForm-proposal-1"]'
        )
      ).toBeNull();
      expect(
        container.querySelector(
          '[data-test-subj="agenticInvestigationsProposalApprove-proposal-1"]'
        )
      ).toBeInTheDocument();
    });

    it('calls dismissProposal.mutateAsync with the reason and rationale on confirm', async () => {
      const mutateAsync = jest.fn().mockResolvedValue({ id: PROPOSAL_ID });
      setupMocks();
      useDismissProposalMock.mockReturnValue({
        ...noopMutation,
        mutateAsync,
      } as unknown as ReturnType<typeof useDismissProposal>);

      const { container } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);

      // Open dismiss mode
      fireEvent.click(
        container.querySelector(
          '[data-test-subj="agenticInvestigationsProposalDismiss-proposal-1"]'
        ) as HTMLButtonElement
      );

      // Enter rationale so the confirm button is enabled
      const rationaleInput = container.querySelector(
        '[data-test-subj="rationale-input"]'
      ) as HTMLInputElement;
      fireEvent.change(rationaleInput, { target: { value: 'Not relevant' } });

      // Confirm
      fireEvent.click(
        container.querySelector(
          '[data-test-subj="agenticInvestigationsProposalDismissConfirm-proposal-1"]'
        ) as HTMLButtonElement
      );

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith({
          id: PROPOSAL_ID,
          body: expect.objectContaining({ rationale: 'Not relevant' }),
        });
      });
    });
  });
});
