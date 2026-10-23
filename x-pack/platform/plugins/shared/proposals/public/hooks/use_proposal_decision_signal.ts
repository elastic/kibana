/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useQueryClient } from '@kbn/react-query';
import { proposalDecisionSignal } from './proposal_decision_signal';
import { queryKeys } from '../query_keys';

/**
 * Invalidates this `QueryClient` when a decision is recorded anywhere else.
 * Some hosts mount the proposals hooks under their own `QueryClient`. This signal connects them.
 * Every read hook in this file calls it, so each consumer gets the link.
 *
 * It skips the mount render and reacts only to a bump after mount. A decision made in this same
 * tree already invalidates itself (see `invalidateProposals`). The extra invalidation here is a
 * harmless repeat.
 */
export function useProposalDecisionSignal(): void {
  const queryClient = useQueryClient();
  const version = useSyncExternalStore(
    proposalDecisionSignal.subscribe,
    proposalDecisionSignal.getSnapshot
  );
  const prevVersionRef = useRef<number | null>(null);

  useEffect(() => {
    const prev = prevVersionRef.current;
    prevVersionRef.current = version;
    if (prev === null || prev === version) {
      return; // skip mount, or no change
    }
    // Join a refetch that is already running. Do not cancel it.
    // Many observers run this effect after one bump, and the decide mutation waits for its own
    // refetch. A cancelled refetch ends at once. Then the mutation ends before the new data
    // arrives, and the row stops showing "Applying" too early.
    void queryClient.invalidateQueries(
      { queryKey: queryKeys.proposals.all },
      { cancelRefetch: false }
    );
  }, [version, queryClient]);
}
