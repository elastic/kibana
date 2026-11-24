/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { Improvement } from '../../common/http_api/improvements';
import { isOpenImprovement } from '../../common/http_api/improvements';
import type { ProposalsProvider, ProposalsProviderContext } from '../proposals/provider';
import type { ImprovementsServiceApi } from './service';
import { addedKiIdFor, isProposable, proposalIdFor } from './propose';

const RECONCILE_CONCURRENCY = 5;

/**
 * Brings the improvements a person decided through their proposal up to date in the store, which
 * is what later runs read their history from. A proposal does not tell its producer about a
 * decision, so this runs on read. An improvement that was transitioned in the meantime is left as
 * the other writer made it.
 */
export const reconcileImprovements = async ({
  improvements,
  improvementsService,
  proposals,
  context,
  logger,
}: {
  improvements: Improvement[];
  improvementsService: ImprovementsServiceApi;
  proposals: ProposalsProvider;
  context: ProposalsProviderContext;
  logger: Logger;
}): Promise<Improvement[]> => {
  const reconciled = new Map<string, Improvement>();
  const open = improvements.filter(
    ({ status, action }) => isOpenImprovement(status) && isProposable(action)
  );

  const reconcileOne = async (improvement: Improvement) => {
    try {
      const outcome = await proposals.getOutcome({
        ...context,
        proposalId: proposalIdFor(improvement.improvement_id),
      });
      if (!outcome || outcome.state === 'open') {
        return;
      }
      const { improvement_id: id } = improvement;
      if (outcome.state === 'applied') {
        reconciled.set(
          id,
          await improvementsService.transition(id, 'applied', {
            ...(outcome.by ? { by: outcome.by } : {}),
            applied_target_id: appliedTargetOf(improvement),
          })
        );
      } else if (outcome.state === 'rejected') {
        reconciled.set(
          id,
          await improvementsService.transition(id, 'rejected', {
            ...(outcome.by ? { by: outcome.by } : {}),
            ...(outcome.reason ? { reason: outcome.reason } : {}),
          })
        );
      } else if (improvement.status !== 'failed') {
        reconciled.set(
          id,
          await improvementsService.transition(id, 'failed', {
            ...(outcome.by ? { by: outcome.by } : {}),
            ...(outcome.error ? { error: outcome.error } : {}),
          })
        );
      }
    } catch (error) {
      logger.warn(
        `Could not reconcile improvement [${improvement.improvement_id}] with its proposal: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  for (let i = 0; i < open.length; i += RECONCILE_CONCURRENCY) {
    await Promise.all(open.slice(i, i + RECONCILE_CONCURRENCY).map(reconcileOne));
  }

  return improvements.map(
    (improvement) => reconciled.get(improvement.improvement_id) ?? improvement
  );
};

/** The KI an approved improvement created or changed: the proposal's action input names it. */
const appliedTargetOf = ({ action, improvement_id: id, target }: Improvement): string =>
  action === 'add_ki' ? addedKiIdFor(id) : target?.ki_id ?? id;
