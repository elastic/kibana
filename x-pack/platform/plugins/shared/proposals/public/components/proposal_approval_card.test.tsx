/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import type { ApprovalAction, ApprovalDecision } from '@kbn/proposals-ui';
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
}));

/** Set by the `ApprovalContent` mock on every render, so a test can invoke an action directly
 *  (e.g. to assert what its promise rejects with) without going through a simulated click. */
let latestPrimaryAction: ApprovalAction | undefined;

jest.mock('@kbn/proposals-ui', () => ({
  ...jest.requireActual('@kbn/proposals-ui'),
  ApprovalContent: ({
    children,
    primaryAction,
    secondaryActions,
    tone,
    comment,
    decision,
    isSubmitting,
    currentActorName,
  }: {
    children?: React.ReactNode;
    tone?: string;
    comment?: string;
    decision?: ApprovalDecision;
    isSubmitting?: 'applying' | 'declining';
    currentActorName?: string;
    primaryAction?: {
      label: string;
      onClick: () => void | Promise<void>;
      isDisabled?: boolean;
      'data-test-subj'?: string;
    };
    secondaryActions?: Array<{
      label: string;
      onClick: () => void;
      isDisabled?: boolean;
      'data-test-subj'?: string;
    }>;
  }) => {
    latestPrimaryAction = primaryAction;
    return (
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
        {/* Surfaced so the comment and decision are observable: the real component renders
            them as props rather than as children. */}
        <div data-test-subj="approval-comment">{comment}</div>
        {decision && (
          <div data-test-subj="approval-decision">
            {decision.status}:{decision.actorName}
            {decision.reason ? `:${decision.reason}` : ''}
          </div>
        )}
        {currentActorName && <div data-test-subj="approval-current-actor">{currentActorName}</div>}
        {isSubmitting && <div data-test-subj="approval-is-submitting">{isSubmitting}</div>}
        {children}
      </div>
    );
  },
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
  useIsApprovingProposal: jest.fn(),
  useIsDecliningProposal: jest.fn(),
}));

jest.mock('../hooks/use_current_user_profile', () => ({
  useCurrentUserProfile: jest.fn(),
}));

jest.mock('@kbn/user-profile-components', () => ({
  getUserDisplayName: (user: { username?: string }) => user?.username ?? '',
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
    latestPrimaryAction = undefined;
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
        container.querySelector('[data-test-subj="proposalApprove-proposal-1"]')
      ).toBeInTheDocument();
    });

    it('renders the Dismiss button', () => {
      setupMocks();
      const { container } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      expect(
        container.querySelector('[data-test-subj="proposalDismiss-proposal-1"]')
      ).toBeInTheDocument();
    });

    it('does not render the dismiss form in view mode', () => {
      setupMocks();
      const { queryByTestId } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      expect(queryByTestId('dismiss-form')).toBeNull();
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
        '[data-test-subj="proposalApprove-proposal-1"]'
      ) as HTMLButtonElement;
      expect(approveBtn).toBeDisabled();
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

    it('does not render action buttons when proposal is already decided', () => {
      setupMocks(
        baseProposal({
          decision: 'dismissed',
          status: 'no_action',
          decidedAt: '2026-01-02T00:00:00.000Z',
          decidedBy: { username: 'ava', fullName: null, email: null },
        })
      );
      const { container } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      expect(container.querySelector('[data-test-subj="proposalApprove-proposal-1"]')).toBeNull();
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
      // Attempt exhaustion settles `expired` while the computed `expired` flag
      // is still false, and nobody decided — so this is the expiry callout,
      // not a decision.
      setupMocks(baseProposal({ expired: false, status: 'expired' }));
      const { getByTestId, queryByTestId } = render(
        <ProposalApprovalCard proposalId={PROPOSAL_ID} />
      );
      expect(getByTestId('warning-callout')).toBeInTheDocument();
      expect(queryByTestId('approval-decision')).toBeNull();
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
      expect(container.querySelector('[data-test-subj="proposalApprove-proposal-1"]')).toBeNull();
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
        container.querySelector('[data-test-subj="proposalApprove-proposal-2"]')
      ).toBeInTheDocument();
      expect(container.querySelector('[data-test-subj="proposalCard-proposal-1"]')).toBeNull();
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
        container.querySelector('[data-test-subj="proposalApprove-proposal-3"]')
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
      setupMocks();
      useApproveProposalMock.mockReturnValue({
        ...noopMutation,
        mutateAsync,
      } as unknown as ReturnType<typeof useApproveProposal>);

      const { container } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      const approveBtn = container.querySelector(
        '[data-test-subj="proposalApprove-proposal-1"]'
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

      await expect(latestPrimaryAction!.onClick()).rejects.toThrow('Network failure');
    });

    it('rejects with a conflict-specific message for a 409', async () => {
      const conflictError = { _isHttpFetchError: true, response: { status: 409 } };
      const mutateAsync = jest.fn().mockRejectedValue(conflictError);
      setupMocks();
      useApproveProposalMock.mockReturnValue({
        ...noopMutation,
        mutateAsync,
      } as unknown as ReturnType<typeof useApproveProposal>);
      render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);

      await expect(latestPrimaryAction!.onClick()).rejects.toThrow(/already been decided/);
    });

    it('rejects with an expiry-specific message for a 410', async () => {
      const expiredError = { _isHttpFetchError: true, response: { status: 410 } };
      const mutateAsync = jest.fn().mockRejectedValue(expiredError);
      setupMocks();
      useApproveProposalMock.mockReturnValue({
        ...noopMutation,
        mutateAsync,
      } as unknown as ReturnType<typeof useApproveProposal>);
      render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);

      await expect(latestPrimaryAction!.onClick()).rejects.toThrow(/deadline has passed/);
    });
  });

  describe('dismiss flow', () => {
    it('switches to dismiss mode when the Dismiss button is clicked', () => {
      setupMocks();
      const { container } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      const dismissBtn = container.querySelector(
        '[data-test-subj="proposalDismiss-proposal-1"]'
      ) as HTMLButtonElement;
      fireEvent.click(dismissBtn);
      expect(
        container.querySelector('[data-test-subj="proposalDismissForm-proposal-1"]')
      ).toBeInTheDocument();
    });

    it('renders the Confirm dismiss and Cancel buttons in dismiss mode', () => {
      setupMocks();
      const { container } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      const dismissBtn = container.querySelector(
        '[data-test-subj="proposalDismiss-proposal-1"]'
      ) as HTMLButtonElement;
      fireEvent.click(dismissBtn);
      expect(
        container.querySelector('[data-test-subj="proposalDismissConfirm-proposal-1"]')
      ).toBeInTheDocument();
      expect(
        container.querySelector('[data-test-subj="proposalDismissCancel-proposal-1"]')
      ).toBeInTheDocument();
    });

    it('returns to view mode when Cancel is clicked', () => {
      setupMocks();
      const { container } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      const dismissBtn = container.querySelector(
        '[data-test-subj="proposalDismiss-proposal-1"]'
      ) as HTMLButtonElement;
      fireEvent.click(dismissBtn);
      const cancelBtn = container.querySelector(
        '[data-test-subj="proposalDismissCancel-proposal-1"]'
      ) as HTMLButtonElement;
      fireEvent.click(cancelBtn);
      expect(
        container.querySelector('[data-test-subj="proposalDismissForm-proposal-1"]')
      ).toBeNull();
      expect(
        container.querySelector('[data-test-subj="proposalApprove-proposal-1"]')
      ).toBeInTheDocument();
    });

    it('keeps Confirm disabled when rationale is whitespace-only', () => {
      setupMocks();
      const { container } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);

      // Open dismiss mode
      fireEvent.click(
        container.querySelector(
          '[data-test-subj="proposalDismiss-proposal-1"]'
        ) as HTMLButtonElement
      );

      // Enter only whitespace
      const rationaleInput = container.querySelector(
        '[data-test-subj="rationale-input"]'
      ) as HTMLInputElement;
      fireEvent.change(rationaleInput, { target: { value: '   ' } });

      const confirmBtn = container.querySelector(
        '[data-test-subj="proposalDismissConfirm-proposal-1"]'
      ) as HTMLButtonElement;
      expect(confirmBtn).toBeDisabled();
    });

    it('passes isSubmitting="declining" to ApprovalContent while useIsDecliningProposal is true', () => {
      setupMocks();
      useIsDecliningProposalMock.mockReturnValue(true);
      const { getByTestId } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);
      expect(getByTestId('approval-is-submitting')).toHaveTextContent('declining');
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
          '[data-test-subj="proposalDismiss-proposal-1"]'
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
          '[data-test-subj="proposalDismissConfirm-proposal-1"]'
        ) as HTMLButtonElement
      );

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith({
          id: PROPOSAL_ID,
          body: expect.objectContaining({ rationale: 'Not relevant' }),
        });
      });
    });

    it('closes the inline dismiss form once the dismissal succeeds, rather than leaving it up beside the outcome', async () => {
      const mutateAsync = jest.fn().mockResolvedValue({ id: PROPOSAL_ID });
      setupMocks();
      useDismissProposalMock.mockReturnValue({
        ...noopMutation,
        mutateAsync,
      } as unknown as ReturnType<typeof useDismissProposal>);

      const { container } = render(<ProposalApprovalCard proposalId={PROPOSAL_ID} />);

      fireEvent.click(
        container.querySelector(
          '[data-test-subj="proposalDismiss-proposal-1"]'
        ) as HTMLButtonElement
      );
      fireEvent.change(
        container.querySelector('[data-test-subj="rationale-input"]') as HTMLInputElement,
        { target: { value: 'Not relevant' } }
      );
      fireEvent.click(
        container.querySelector(
          '[data-test-subj="proposalDismissConfirm-proposal-1"]'
        ) as HTMLButtonElement
      );

      await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
      await waitFor(() =>
        expect(
          container.querySelector('[data-test-subj="proposalDismissForm-proposal-1"]')
        ).not.toBeInTheDocument()
      );
    });
  });
});
