/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { useGetProposal } from '../api';
import { VIEW_INVESTIGATION } from '../translations';
import { useOpenProposalConversation } from './use_open_proposal_conversation';

/** Activity-row action. Hidden until the proposal is read, and when there is no flyout to open. */
export const OpenInvestigationButton = ({ proposalId }: { proposalId: string }) => {
  const { data: proposal } = useGetProposal(proposalId);
  const openConversation = useOpenProposalConversation();

  if (!proposal || !openConversation) {
    return null;
  }

  return (
    <EuiToolTip content={VIEW_INVESTIGATION} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="chevronSingleRight"
        aria-label={VIEW_INVESTIGATION}
        onClick={() => openConversation(proposal.conversationId)}
        data-test-subj={`proposal-view-investigation-${proposalId}`}
      />
    </EuiToolTip>
  );
};

OpenInvestigationButton.displayName = 'OpenInvestigationButton';
