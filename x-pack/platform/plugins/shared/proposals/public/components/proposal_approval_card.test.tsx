/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import type { ApprovalAction, ApprovalProposal, DeclineParams } from '@kbn/proposals-ui';
import { ProposalApprovalCard } from './proposal_approval_card';
import {
  useProposal,
  useApproveProposal,
  useDismissProposal,
  useIsApprovingProposal,
  useIsDecliningProposal,
} from '../hooks/use_proposals_api';
import { useCurrentUserProfile } from '../hooks/use_current_user_profile';
import type { ProposalWithMetadata } from '@kbn/proposals-common';

// ── Mock heavy external deps ──────────────────────────────────────────────────

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useEuiTheme: () => ({ euiTheme: { size: { m: '16px', s: '8px' } } }),
  useGeneratedHtmlId: () => 'generated-id',
  EuiLoadingSpinner: ({ size }: { size: string }) => (
    <div data-test-subj="loading-spinner" data-size={size} />
  ),
  EuiSpacer: () => <div />,
}));

jest.mock('@kbn/ui-callout', () => ({
  KbnInfoCallout: ({ title }: { title: string }) => (
    <div data-test-subj="info-callout">{title}</div>
  ),
  KbnDangerCallout: ({ title }: { title: string }) => (
    <div data-test-subj="danger-callout">{title}</div>
  ),
  KbnWarningCallout: ({ title, children }: { title: string; children?: React.ReactNode }) => (
    <div data-test-subj="warning-callout">
      {title}
      {children}
    </div>
  ),
}));

/** Set by the `ApprovalContent` mock on every render, so a test can invoke an action directly
 *  (e.g. to assert what its promise rejects with) without going through a simulated click. */
let latestOnApprove: (() => void | Promise<void>) | undefined;
let latestOnDismiss: ((params: DeclineParams) => Promise<void>) | undefined;

jest.mock('@kbn/proposals-ui', () => {
  const actual = jest.requireActual('@kbn/proposals-ui');
  return {
    ...actual,
    // A thin stand-in rather than the real component: it exercises `ProposalApprovalCard`'s own
    // hook wiring and loading/error/superseded logic, which is this file's job — `ApprovalContent`'s
    // own rendering (tone, caption, decision, the Approve button's label/color/disablement) is
    // already covered by `approval_content.test.tsx` and `approval_modal.test.tsx`. Derives
    // decision/expiry from the real helpers rather than re-implementing them, so this mock can't
    // quietly drift from what the real component actually does.
    ApprovalContent: ({
      proposal,
      onApprove,
      secondaryActions,
      readOnly,
      onDismiss,
      isSubmitting,
      currentActorName,
      'data-test-subj': dataTestSubj,
    }: {
      proposal: ApprovalProposal;
      onApprove?: () => void | Promise<void>;
      secondaryActions?: ApprovalAction[];
      readOnly?: boolean;
      onDismiss?: (params: DeclineParams) => Promise<void>;
      isSubmitting?: 'applying' | 'declining';
      currentActorName?: string;
      'data-test-subj'?: string;
    }) => {
      const [isDeclining, setIsDeclining] = React.useState(false);
      const isReplaced = proposal.supersededBy !== undefined || proposal.status === 'superseded';
      latestOnApprove = onApprove;
      latestOnDismiss = onDismiss;
      const decision = isReplaced ? undefined : actual.getProposalDecision(proposal);
      const isExpired = actual.isProposalExpired(proposal);
      return (
        <div data-test-subj="approval-content">
          {onApprove && (
            <button
              onClick={onApprove}
              disabled={isReplaced || isExpired || readOnly}
              data-test-subj={dataTestSubj ? `${dataTestSubj}-confirm` : undefined}
            >
              Approve
            </button>
          )}
          {secondaryActions?.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              disabled={action.isDisabled}
              data-test-subj={action['data-test-subj']}
            >
              {action.label}
            </button>
          ))}
          {onDismiss && (
            <button onClick={() => setIsDeclining(true)} data-test-subj={`${dataTestSubj}-dismiss`}>
              Dismiss
            </button>
          )}
          {isDeclining && <div data-test-subj="mock-dismiss-form" />}
          <div data-test-subj="approval-title">{proposal.title}</div>
          {/* Surfaced so the comment and decision are observable: the real component renders
              them off the proposal rather than as separate props. */}
          <div data-test-subj="approval-comment">{proposal.comment}</div>
          {decision && (
            <div data-test-subj="approval-decision">
              {decision.status}:{decision.actorName}
              {decision.reason ? `:${decision.reason}` : ''}
            </div>
          )}
          {currentActorName && (
            <div data-test-subj="approval-current-actor">{currentActorName}</div>
          )}
          {isSubmitting && <div data-test-subj="approval-is-submitting">{isSubmitting}</div>}
          {/* Mirrors the real `ApprovalContent`'s own gating: only while still pending, i.e. no
              `decision` yet. */}
          {!isReplaced && !decision && proposal.previousExecutionError && (
            <div data-test-subj="warning-callout">
              A previous attempt at this action failed
              {proposal.previousExecutionError}
            </div>
          )}
          {!isReplaced && isExpired && <div data-test-subj="warning-callout">Expired</div>}
        </div>
      );
    },
  };
});

jest.mock('@kbn/core-http-browser', () => ({
  isHttpFetchError: (e: unknown) => {
    return (e as { _isHttpFetchError?: boolean })?._isHttpFetchError === true;
  },
}));

jest.mock('../hooks/use_proposals_api', () => ({
  useProposal: jest.fn(),
  useApproveProposal: jest.fn(),
  useDismissProposal: jest.fn(),
  useIsApprovingProposal: jest.fn(),
  useIsDecliningProposal: jest.fn(),
}));

jest.mock('../hooks/use_current_user_profile', () => ({
  useCurrentUserProfile: jest.fn(),
}));

jest.mock('@kbn/user-profile-components', () => ({
  getUserDisplayName: (user: { username?: string }) => user?.username ?? '',
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const useProposalMock = useProposal as jest.MockedFunction<typeof useProposal>;
const useApproveProposalMock = useApproveProposal as jest.MockedFunction<typeof useApproveProposal>;
const useDismissProposalMock = useDismissProposal as jest.MockedFunction<typeof useDismissProposal>;
const useIsApprovingProposalMock = useIsApprovingProposal as jest.MockedFunction<
  typeof useIsApprovingProposal
>;
const useIsDecliningProposalMock = useIsDecliningProposal as jest.MockedFunction<
  typeof useIsDecliningProposal
>;
const useCurrentUserProfileMock = useCurrentUserProfile as jest.MockedFunction<
  typeof useCurrentUserProfile
>;

const baseProposal = (overrides: Partial<ProposalWithMetadata> = {}): ProposalWithMetadata => ({
  id: 'proposal-1',
  spaceId: 'default',
  conversationId: 'conv-1',
  title: 'Tune the noisy rule',
  comment: 'Tune the noisy rule',
  status: 'pending',
  impact: 'low',
  confidence: 'medium',
  origin: 'alertzero',
  createdAt: '2026-01-01T00:00:00.000Z',
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
  useIsApprovingProposalMock.mockReturnValue(false);
  useIsDecliningProposalMock.mockReturnValue(false);
  useCurrentUserProfileMock.mockReturnValue({ data: null } as unknown as ReturnType<
    typeof useCurrentUserProfile
  >);
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ProposalApprovalCard', () => {
  const PROPOSAL_ID = 'proposal-1';

  beforeEach(() => {
    jest.clearAllMocks();
    latestOnApprove = undefined;
    latestOnDismiss = undefined;
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

  describe('comment', () => {
    it("renders the proposal's own markdown comment as the body", () => {
      setupMocks();
      const { getByTestId } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      expect(getByTestId('approval-comment')).toHaveTextContent('Tune the noisy rule');
    });
  });

  describe('view mode — pending proposal', () => {
    it('renders the card wrapper with the proposal-scoped test id', () => {
      setupMocks();
      const { container } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      expect(
        container.querySelector('[data-test-subj="proposalCard-proposal-1"]')
      ).toBeInTheDocument();
    });

    it('renders the Approve button', () => {
      setupMocks();
      const { container } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      expect(
        container.querySelector('[data-test-subj="proposalCard-proposal-1-confirm"]')
      ).toBeInTheDocument();
    });

    it('passes onDismiss to ApprovalContent so its built-in decline flow is enabled', () => {
      setupMocks();
      render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      expect(latestOnDismiss).toBeDefined();
    });

    it("passes the analyst's display name as the current actor", () => {
      setupMocks();
      useCurrentUserProfileMock.mockReturnValue({
        data: { user: { username: 'ava' } },
      } as unknown as ReturnType<typeof useCurrentUserProfile>);
      const { getByTestId } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      expect(getByTestId('approval-current-actor')).toHaveTextContent('ava');
    });
  });

  describe('a proposal re-offered after a failed attempt', () => {
    const FAILURE = 'Rule update rejected: invalid query';

    it('explains why it is being offered again', () => {
      setupMocks(baseProposal({ status: 'pending', previousExecutionError: FAILURE }));
      const { getByTestId } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);

      const callout = getByTestId('warning-callout');
      expect(callout).toHaveTextContent('A previous attempt at this action failed');
      // The reason is the actionable half: the title alone does not tell an
      // analyst whether re-approving is likely to fail the same way.
      expect(callout).toHaveTextContent(FAILURE);
    });

    it('drops the explanation once the proposal is no longer awaiting a decision', () => {
      setupMocks(
        baseProposal({ status: 'succeeded', decision: 'approved', previousExecutionError: FAILURE })
      );
      const { container } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);

      expect(container).not.toHaveTextContent(FAILURE);
    });
  });

  describe('already-decided proposal', () => {
    it('passes an applying decision for an approved proposal whose action is still executing', () => {
      setupMocks(
        baseProposal({
          decision: 'approved',
          status: 'executing',
          decidedAt: '2026-01-02T00:00:00.000Z',
          decidedBy: { username: 'ava', fullName: null, email: null },
        })
      );
      const { getByTestId } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      // Approving only resumes the gate workflow — while the action it started is still
      // `executing`, this must not yet claim it applied.
      expect(getByTestId('approval-decision')).toHaveTextContent('applying:ava');
    });

    it('passes an applied decision for an approved proposal once its action has succeeded', () => {
      setupMocks(
        baseProposal({
          decision: 'approved',
          status: 'succeeded',
          decidedAt: '2026-01-02T00:00:00.000Z',
          decidedBy: { username: 'ava', fullName: null, email: null },
        })
      );
      const { getByTestId } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      expect(getByTestId('approval-decision')).toHaveTextContent('applied:ava');
    });

    it('passes a failed decision for an approved proposal whose action did not succeed', () => {
      setupMocks(
        baseProposal({
          decision: 'approved',
          status: 'failed',
          decidedAt: '2026-01-02T00:00:00.000Z',
          decidedBy: { username: 'ava', fullName: null, email: null },
        })
      );
      const { getByTestId } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      expect(getByTestId('approval-decision')).toHaveTextContent('failed:ava');
    });

    it('passes a declined decision for a dismissed proposal, with its rationale as the reason', () => {
      setupMocks(
        baseProposal({
          decision: 'dismissed',
          status: 'no_action',
          decidedAt: '2026-01-02T00:00:00.000Z',
          decidedBy: { username: 'ava', fullName: null, email: null },
          rationale: 'Not relevant',
        })
      );
      const { getByTestId } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      expect(getByTestId('approval-decision')).toHaveTextContent('declined:ava:Not relevant');
    });

    it('does not render an approve button or enable decline when proposal is already decided', () => {
      setupMocks(
        baseProposal({
          decision: 'dismissed',
          status: 'no_action',
          decidedAt: '2026-01-02T00:00:00.000Z',
          decidedBy: { username: 'ava', fullName: null, email: null },
        })
      );
      const { container } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      expect(
        container.querySelector('[data-test-subj="proposalCard-proposal-1-confirm"]')
      ).toBeNull();
      expect(latestOnDismiss).toBeUndefined();
    });

    it('reads the decision rather than the status, which lags behind the gate', () => {
      // An approval stays `pending` until the gate workflow's post-gate steps
      // run, so a card keyed on the status would offer the buttons again to
      // the next person to look at it.
      setupMocks(
        baseProposal({
          decision: 'approved',
          status: 'pending',
          decidedAt: '2026-01-02T00:00:00.000Z',
          decidedBy: { username: 'ava', fullName: null, email: null },
        })
      );
      const { getByTestId } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      expect(getByTestId('approval-decision')).toBeInTheDocument();
    });

    it('explains an expiry the workflow settled before the deadline', () => {
      // Attempt exhaustion settles `status: 'expired'` and nobody decided — `getProposalDecision`
      // still reports a real (actor-less) decision for it, so `ApprovalContent`'s own "Expired"
      // badge shows alongside this callout rather than instead of it.
      setupMocks(baseProposal({ status: 'expired' }));
      const { getByTestId } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      expect(getByTestId('warning-callout')).toBeInTheDocument();
      expect(getByTestId('approval-decision')).toHaveTextContent('expired:');
    });

    it('names a fallback actor rather than hiding a decision that plainly exists', () => {
      // `decision` is the whole condition — decidedBy can still be genuinely absent (no
      // resolvable identity), but that decided card must not read as still pending either.
      setupMocks(
        baseProposal({
          decision: 'approved',
          status: 'executing',
          decidedAt: '2026-01-02T00:00:00.000Z',
        })
      );
      const { getByTestId } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      expect(getByTestId('approval-decision')).toHaveTextContent('applying:Someone');
    });
  });

  describe('executing proposal', () => {
    it('does not render action buttons when proposal is executing', () => {
      setupMocks(baseProposal({ status: 'executing' }));
      const { container } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      expect(
        container.querySelector('[data-test-subj="proposalCard-proposal-1-confirm"]')
      ).toBeNull();
    });
  });

  describe('superseded row', () => {
    it.each<Partial<ProposalWithMetadata>>([
      { status: 'superseded', supersededBy: 'proposal-2' },
      { status: 'failed', decision: 'approved', supersededBy: 'proposal-2' },
      { status: 'superseded' },
      { status: 'pending', supersededBy: 'proposal-2' },
      { status: 'expired', supersededBy: 'proposal-2' },
    ])('renders its own historical content for %j', (overrides) => {
      setupMocks(baseProposal({ ...overrides, comment: 'Original recommendation' }));
      const { container, getByText, queryByText } = render(
        <ProposalApprovalCard proposalId={PROPOSAL_ID} />
      );

      expect(getByText('Original recommendation')).toBeInTheDocument();
      expect(getByText('This proposal has been replaced.')).toBeInTheDocument();
      expect(
        container.querySelector('[data-test-subj="proposalCard-proposal-1-confirm"]')
      ).toBeDisabled();
      expect(
        container.querySelector('[data-test-subj="proposalDismiss-proposal-1"]')
      ).toBeDisabled();
      expect(queryByText(/No further action is needed/)).not.toBeInTheDocument();
      expect(container.querySelector('[data-test-subj="approval-decision"]')).toBeNull();
      expect(container.querySelector('[data-test-subj="approval-is-submitting"]')).toBeNull();
      expect(queryByText(/The decision deadline has passed/)).not.toBeInTheDocument();
      expect(useProposalMock.mock.calls.every(([id]) => id === PROPOSAL_ID)).toBe(true);
    });

    it('hides an open dismissal form when the proposal is replaced', () => {
      setupMocks();
      const proposalUpdater: {
        current: React.Dispatch<React.SetStateAction<ProposalWithMetadata>>;
      } = { current: () => undefined };
      const useMockProposal = (): ReturnType<typeof useProposal> => {
        const [data, setData] = React.useState(baseProposal());
        proposalUpdater.current = setData;
        return { data, isLoading: false, isError: false } as ReturnType<typeof useProposal>;
      };
      useProposalMock.mockImplementation(useMockProposal);
      const { container } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      const dismissButton = container.querySelector(
        '[data-test-subj="proposalCard-proposal-1-dismiss"]'
      );
      expect(dismissButton).toBeInTheDocument();
      if (dismissButton) {
        fireEvent.click(dismissButton);
      }
      expect(container.querySelector('[data-test-subj="mock-dismiss-form"]')).toBeInTheDocument();

      act(() =>
        proposalUpdater.current(baseProposal({ status: 'superseded', supersededBy: 'proposal-2' }))
      );
      expect(container.querySelector('[data-test-subj="mock-dismiss-form"]')).toBeNull();
      expect(latestOnDismiss).toBeUndefined();
      expect(
        container.querySelector('[data-test-subj="proposalDismiss-proposal-1"]')
      ).toBeDisabled();
    });
  });

  describe('approve flow', () => {
    it('calls approveProposal.mutateAsync when the Approve button is clicked', async () => {
      const mutateAsync = jest.fn().mockResolvedValue({ id: PROPOSAL_ID });
      setupMocks();
      useApproveProposalMock.mockReturnValue({
        ...noopMutation,
        mutateAsync,
      } as unknown as ReturnType<typeof useApproveProposal>);

      const { container } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      const approveBtn = container.querySelector(
        '[data-test-subj="proposalCard-proposal-1-confirm"]'
      ) as HTMLButtonElement;
      fireEvent.click(approveBtn);

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith({
          id: PROPOSAL_ID,
          body: expect.objectContaining({}),
        });
      });
    });

    it('passes isSubmitting="applying" to ApprovalContent while useIsApprovingProposal is true', () => {
      setupMocks();
      useIsApprovingProposalMock.mockReturnValue(true);
      const { getByTestId } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      expect(getByTestId('approval-is-submitting')).toHaveTextContent('applying');
    });

    it('rejects with a friendly message rather than the raw generic error', async () => {
      const mutateAsync = jest.fn().mockRejectedValue(new Error('Network failure'));
      useApproveProposalMock.mockReturnValue({
        ...noopMutation,
        mutateAsync,
      } as unknown as ReturnType<typeof useApproveProposal>);
      setupMocks();
      useApproveProposalMock.mockReturnValue({
        ...noopMutation,
        mutateAsync,
      } as unknown as ReturnType<typeof useApproveProposal>);
      render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);

      await expect(latestOnApprove!()).rejects.toThrow('Network failure');
    });

    // A 409 covers every way `assertDecidable` can refuse a non-`pending` proposal — already
    // decided, settled as expired, or otherwise superseded — so the message stays generic rather
    // than naming one cause.
    it('rejects with a conflict-specific message for a 409', async () => {
      const conflictError = { _isHttpFetchError: true, response: { status: 409 } };
      const mutateAsync = jest.fn().mockRejectedValue(conflictError);
      setupMocks();
      useApproveProposalMock.mockReturnValue({
        ...noopMutation,
        mutateAsync,
      } as unknown as ReturnType<typeof useApproveProposal>);
      render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);

      await expect(latestOnApprove!()).rejects.toThrow(/no longer available to decide/);
    });
  });

  describe('decline flow', () => {
    it('passes isSubmitting="declining" to ApprovalContent while useIsDecliningProposal is true', () => {
      setupMocks();
      useIsDecliningProposalMock.mockReturnValue(true);
      const { getByTestId } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      expect(getByTestId('approval-is-submitting')).toHaveTextContent('declining');
    });

    it('calls dismissProposal.mutateAsync with the reason and rationale onDismiss provides', async () => {
      const mutateAsync = jest.fn().mockResolvedValue({ id: PROPOSAL_ID });
      setupMocks();
      useDismissProposalMock.mockReturnValue({
        ...noopMutation,
        mutateAsync,
      } as unknown as ReturnType<typeof useDismissProposal>);

      render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);

      await latestOnDismiss!({ dismissReason: 'risk_accepted', rationale: 'Not relevant' });

      expect(mutateAsync).toHaveBeenCalledWith({
        id: PROPOSAL_ID,
        body: { dismissReason: 'risk_accepted', rationale: 'Not relevant' },
      });
    });

    it('rejects with a friendly message rather than the raw generic error', async () => {
      const mutateAsync = jest.fn().mockRejectedValue(new Error('Network failure'));
      setupMocks();
      useDismissProposalMock.mockReturnValue({
        ...noopMutation,
        mutateAsync,
      } as unknown as ReturnType<typeof useDismissProposal>);

      render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);

      await expect(latestOnDismiss!({ dismissReason: 'no_reason' })).rejects.toThrow(
        'Network failure'
      );
    });
  });
});
