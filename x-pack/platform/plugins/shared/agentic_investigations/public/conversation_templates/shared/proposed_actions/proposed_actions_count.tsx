/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiText } from '@elastic/eui';
import { useConversationProposals } from '@kbn/proposals-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';

export interface ProposedActionsCountProps {
  conversationId: string;
}

/**
 * Count of this conversation's proposals, shown beside the "Proposed actions" heading. Reads the
 * same query as `ProposedActionsSlot`, so it adds no request and moves with the list. Renders
 * nothing while loading, on error and when empty: the list below already owns those states.
 */
export const ProposedActionsCount = ({ conversationId }: ProposedActionsCountProps) => {
  const { data, error } = useConversationProposals(conversationId);
  const total = data?.pages[0]?.total ?? 0;
  const appliedCount = useMemo(
    () =>
      (data?.pages[0].proposals ?? []).reduce<number>(
        (count, proposal) =>
          count + (proposal.decision === 'approved' && proposal.status !== 'failed' ? 1 : 0),
        0
      ),
    [data]
  );

  if (error || total <= 1) {
    return null;
  }

  return (
    <EuiText
      style={{ fontWeight: 500 }}
      size="xs"
      data-test-subj="investigationFlyoutProposedActionsCount"
    >
      <FormattedMessage
        id="xpack.agenticInvestigations.proposedActionsCount"
        defaultMessage="{appliedCount} of {total} applied"
        values={{ total, appliedCount }}
      />
    </EuiText>
  );
};
