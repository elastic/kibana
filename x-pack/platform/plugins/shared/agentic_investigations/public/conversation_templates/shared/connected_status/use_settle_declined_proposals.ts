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
 * workflow afterwards. Like a single decline: the rows stay put and read `Declining` until every
 * decision lands and the data is refreshed. Then they leave the host's queue (when it supplies
 * `dropDecidedProposal`) and Closed picks them up. A refresh before the decisions land would read
 * the rows as pending and restore them.
 *
 * Each tracker stays open until the refresh ends. If a tracker ended first, its row would read
 * the old, pending data for a moment and show "Needs review".
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

      let release!: () => void;
      const refreshed = new Promise<void>((resolve) => {
        release = resolve;
      });
      const decided = new Set<string>();
      let refreshStarted = false;
      let refreshError: unknown;
      // Counts each proposal once. The `finally` below covers a tracker that fails before its
      // decision, so one failure cannot hold the others open for ever.
      const markDecided = (id: string) => {
        decided.add(id);
        if (decided.size === proposalIds.length && !refreshStarted) {
          refreshStarted = true;
          void (async () => {
            try {
              await Promise.all(proposalIds.map((proposalId) => dropDecidedProposal?.(proposalId)));
              await queryClient.invalidateQueries({ queryKey: platformQueryKeys.proposals.all });
            } catch (error) {
              // Kept for the caller. The trackers must still be released, or the rows stay on
              // "Declining" for ever.
              refreshError = error;
            } finally {
              release();
            }
          })();
        }
      };

      await Promise.all(
        proposalIds.map((id) =>
          settleDeclined(id, queryClient, async () => {
            markDecided(id);
            await refreshed;
          }).finally(() => markDecided(id))
        )
      );
      statusSignal.bump();
      if (refreshError !== undefined) {
        throw refreshError;
      }
    },
    [dropDecidedProposal, settleDeclined]
  );
};
