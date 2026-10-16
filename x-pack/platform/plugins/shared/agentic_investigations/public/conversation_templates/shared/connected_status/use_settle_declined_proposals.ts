/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import {
  queryKeys as platformQueryKeys,
  useSettleDeclinedProposal,
} from '@kbn/proposals-plugin/public';
import { getSharedInvestigationsQueryClient } from '../../../shared_query_client';
import { statusSignal } from './status_signal';

/**
 * Closing releases each pending proposal's gate, but the decline itself is written by the gate
 * workflow afterwards. Like a single decline: the rows stay put and read `Declining` until the
 * decision lands, then leave the host's queue (when it supplies `dropDecidedProposal`) and Closed
 * picks them up. Refreshing any earlier would read them as pending and restore the rows.
 *
 * Tracked on the shared investigations client, where the flyout's proposal cards and a solution's
 * queue read from, not the caller's: the flyout's status toggle runs in an isolated client, so
 * `Declining` set there would never reach those cards.
 */
export const useSettleDeclinedProposals = (
  dropDecidedProposal?: (proposalId: string) => Promise<void> | void
) => {
  const settleDeclined = useSettleDeclinedProposal();

  return useCallback(
    async (proposalIds: string[]): Promise<void> => {
      if (proposalIds.length === 0) {
        return;
      }
      const queryClient = await getSharedInvestigationsQueryClient();
      await Promise.all(proposalIds.map((id) => settleDeclined(id, queryClient)));
      await Promise.all(proposalIds.map((id) => dropDecidedProposal?.(id)));
      queryClient.invalidateQueries({ queryKey: platformQueryKeys.proposals.all });
      statusSignal.bump();
    },
    [dropDecidedProposal, settleDeclined]
  );
};
