/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { useConversationProposals } from '@kbn/proposals-plugin/public';
import type { ProposalWithMetadata } from '@kbn/proposals-common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { ProposedActionButton, ProposedActionsList } from '@kbn/agentic-investigations-common';
import { decisionErrorMessage } from './decision_errors';
import { useProposalDecision } from './use_proposal_decision';
import {
  PROPOSED_ACTIONS_EMPTY_LABEL,
  PROPOSED_ACTIONS_LOAD_ERROR_LABEL,
  PROPOSED_ACTIONS_SHOW_MORE_LABEL,
} from './translations';

export interface ProposedActionsSlotProps {
  conversationId: string;
}

interface ProposedActionRowProps {
  proposal: ProposalWithMetadata;
  onDecisionError: (err: unknown) => void;
}

/**
 * One row, split out from `ProposedActionsSlot` so the decision hooks — each scoped to this row's
 * own proposal id — are called a fixed number of times per render, rather than a variable number
 * inside the list's `.map`.
 */
const ProposedActionRow = ({ proposal, onDecisionError }: ProposedActionRowProps) => {
  const { readOnly, isSubmitting, currentActorName, approve, dismiss, reopen, isReopening } =
    useProposalDecision(proposal.id);

  return (
    <ProposedActionButton
      proposal={proposal}
      readOnly={readOnly}
      isSubmitting={isSubmitting}
      onConfirm={async () => {
        try {
          await approve(proposal.actionInput);
        } catch (err) {
          onDecisionError(err);
          throw err;
        }
      }}
      onDismiss={async (params) => {
        try {
          await dismiss(params);
        } catch (err) {
          onDecisionError(err);
          throw err;
        }
      }}
      onReopen={async () => {
        try {
          await reopen();
        } catch (err) {
          onDecisionError(err);
          throw err;
        }
      }}
      isReopening={isReopening}
      currentActorName={currentActorName}
      data-test-subj={`investigationFlyoutProposedAction-${proposal.id}`}
    />
  );
};

/**
 * `renderProposedActions` content for the investigation flyout's overview tab. Shows the whole
 * proposal history for this conversation, decided or not, so an already-applied action still
 * shows the closed record `ProposedActionButton` renders — rather than `usePendingProposals`,
 * which drops a proposal the moment it stops awaiting a human. Each row's `isSubmitting` is
 * scoped to its own proposal id, so its badge and its approval modal's decline form track the
 * exact same mutation rather than one row's submission lighting up every other row too.
 */
export const ProposedActionsSlot = ({ conversationId }: ProposedActionsSlotProps) => {
  const {
    services: { notifications },
  } = useKibana<CoreStart>();
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useConversationProposals(conversationId);

  const onDecisionError = useCallback(
    (err: unknown) => notifications?.toasts.addDanger(decisionErrorMessage(err)),
    [notifications]
  );

  if (isLoading) {
    return <EuiLoadingSpinner size="m" />;
  }

  // Distinct from the empty state below: the API could not be reached at all, so there may be
  // proposed actions this analyst just cannot see right now — telling them "none" would be wrong.
  if (isError) {
    return <KbnDangerCallout size="s" title={PROPOSED_ACTIONS_LOAD_ERROR_LABEL} />;
  }

  // Deduplicated because the pages are offset windows over a list a decision can move rows
  // within: a proposal decided between two fetches shifts everything after it up.
  const proposals = [
    ...new Map(
      (data?.pages ?? []).flatMap((page) => page.proposals).map((p) => [p.id, p])
    ).values(),
  ];

  if (proposals.length === 0) {
    return (
      <EuiText size="s" color="subdued">
        {PROPOSED_ACTIONS_EMPTY_LABEL}
      </EuiText>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem>
        <ProposedActionsList data-test-subj="investigationFlyoutProposedActionsList">
          {proposals.map((proposal) => (
            <ProposedActionRow
              // A retry gets a new id but keeps the root id, so its row and open modal stay mounted.
              key={proposal.rootProposalId ?? proposal.id}
              proposal={proposal}
              onDecisionError={onDecisionError}
            />
          ))}
        </ProposedActionsList>
      </EuiFlexItem>
      {hasNextPage && (
        <EuiFlexItem>
          <EuiButtonEmpty
            size="s"
            isLoading={isFetchingNextPage}
            onClick={() => fetchNextPage()}
            data-test-subj="investigationFlyoutProposedActionsShowMore"
          >
            {PROPOSED_ACTIONS_SHOW_MORE_LABEL}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
