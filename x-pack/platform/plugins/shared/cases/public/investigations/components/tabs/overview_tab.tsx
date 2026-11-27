/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useItem } from '../../hooks';
import { ClaimFlyout, ClaimsCard } from '../claims';
import { SinceCard } from '../overview/since_card';
import { StateCard } from '../overview/state_card';
import { VerdictCard } from '../overview/verdict_card';
import { ProposalsCard } from '../proposals';
import type { TabProps } from './tab_props';

/**
 * Where the investigation stands, what changed since the last handoff, the verdict, the actions
 * waiting for a decision and the claims. The claim flyout is driven by the `item` URL parameter.
 */
export const OverviewTab: React.FC<TabProps> = ({
  record,
  agentAvailable,
  onNavigateTab,
  openItemId,
  onOpenModal,
}) => {
  const [openClaimId, setOpenClaimId] = useState<string | null>(null);
  const { data: openItem } = useItem(record.id, openItemId);

  useEffect(() => {
    if (!openItemId) {
      setOpenClaimId(null);
    } else if (openItem?.item.kind === 'claim') {
      setOpenClaimId(openItem.item.id);
    }
  }, [openItemId, openItem]);

  const openClaim = useCallback(
    (claimId: string) => {
      setOpenClaimId(claimId);
      onNavigateTab('overview', { itemId: claimId });
    },
    [onNavigateTab]
  );

  const closeClaim = useCallback(() => {
    setOpenClaimId(null);
    if (openItemId) {
      onNavigateTab('overview');
    }
  }, [onNavigateTab, openItemId]);

  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="investigationOverviewTab">
      <EuiFlexItem>
        <StateCard record={record} onNavigateTab={onNavigateTab} onOpenModal={onOpenModal} />
      </EuiFlexItem>
      <EuiFlexItem>
        <SinceCard record={record} onNavigateTab={onNavigateTab} onOpenClaim={openClaim} />
      </EuiFlexItem>
      <EuiFlexItem>
        <VerdictCard record={record} onNavigateTab={onNavigateTab} onOpenModal={onOpenModal} />
      </EuiFlexItem>
      <EuiFlexItem>
        <ProposalsCard
          record={record}
          agentAvailable={agentAvailable}
          onNavigateTab={onNavigateTab}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <ClaimsCard record={record} onOpenClaim={openClaim} onNavigateTab={onNavigateTab} />
      </EuiFlexItem>
      {openClaimId ? (
        <ClaimFlyout
          record={record}
          claimId={openClaimId}
          onClose={closeClaim}
          onNavigateTab={onNavigateTab}
        />
      ) : null}
    </EuiFlexGroup>
  );
};
OverviewTab.displayName = 'OverviewTab';
