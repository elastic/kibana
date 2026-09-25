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
 * Invalidates this hook's own `QueryClient` whenever a decision is recorded anywhere else —
 * bridging the gap between hosts that each mount proposals hooks under an isolated `QueryClient`.
 * Called from every read hook in this file, so any consumer gets the bridge for free.
 *
 * Skips the mount render so it only reacts to a genuine post-mount bump. A decision recorded by
 * this same tree already invalidates itself directly (see `invalidateProposals`); the extra
 * invalidation this causes here is a harmless repeat, not a correctness issue.
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
    void queryClient.invalidateQueries({ queryKey: queryKeys.proposals.all });
  }, [version, queryClient]);
}
