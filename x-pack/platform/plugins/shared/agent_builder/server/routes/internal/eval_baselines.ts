/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import {
  EVAL_BASELINES_PIN_URL,
  EVAL_BASELINES_LATEST_URL,
  EVAL_BASELINE_SCORES_URL,
  MAX_PINNABLE_SCORES,
  UNBOUNDED_SCORE_FIELDS,
  SCORES_SORT_ORDER,
  buildExperimentFilterQuery,
  resolveJudgeModelIds,
  PinEvaluationBaselineRequestBody,
  GetLatestPinnedBaselineRequestQuery,
  GetPinnedBaselineScoresRequestParams,
} from '@kbn/evals-common';
import type { EvaluationScoreDocument } from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { isMaximumResponseSizeExceededError } from '@kbn/es-errors';

import { EVALS_API_PRIVILEGES } from '@kbn/evals-plugin/common';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import { PinnedBaselineScoreCountMismatchError } from '../../services/eval_baselines/errors';

/**
 * One execution is one baseline per space: the id is derived from the tuple rather than
 * minted per request, so a retried `_pin` targets the same document IDs instead of
 * stranding a pointerless snapshot per failed attempt, and pinning the same execution
 * again re-promotes its stored snapshot rather than duplicating it. The space is part of
 * the id so pinning a shared execution in a second space creates that space's own
 * baseline instead of colliding with the first one's documents. JSON encoding keeps
 * distinct tuples from hashing alike whatever characters the ids contain.
 */
const deterministicBaselineId = (spaceId: string, suiteId: string, executionId: string): string =>
  createHash('sha256')
    .update(JSON.stringify([spaceId, suiteId, executionId]))
    .digest('hex');

/**
 * The pinned-baseline registry for regression eval suites. The registry lives on the
 * evaluations ("golden") cluster: `evals compare --baseline-pinned` resolves the active
 * baseline through these routes, and the scheduled baseline pipeline publishes one with
 * `_pin`. Pinning snapshots the execution's scores out of the evals plugin's scores data
 * stream, so the evals plugin must run in `full` mode on this Kibana for `_pin` to work.
 */
export function registerEvalBaselineRoutes({
  router,
  coreSetup,
  getInternalServices,
  pluginsSetup,
  logger,
}: RouteDependencies) {
  // Registered only where the evals product runs (the evaluations cluster, local eval
  // stacks): the registry is meaningless without it, and the privileges these routes
  // require (`read_evals` / `manage_evals`) only exist once the evals feature registers.
  // The setup contract reports the configured mode even when the plugin is disabled, so
  // both conditions matter.
  const { evals } = pluginsSetup;
  if (!evals?.enabled || evals.mode !== 'full') {
    return;
  }

  const wrapHandler = getHandlerWrapper({ logger });

  router.post(
    {
      path: EVAL_BASELINES_PIN_URL,
      security: {
        authz: {
          // Pinning snapshots evals score documents and promotes the active regression
          // baseline, so it demands the same privilege as score ingestion — not merely
          // Agent Builder write access.
          requiredPrivileges: [EVALS_API_PRIVILEGES.manage],
        },
      },
      options: { access: 'internal' },
      validate: {
        body: buildRouteValidationWithZod(PinEvaluationBaselineRequestBody),
      },
    },
    wrapHandler(async (context, request, response) => {
      const {
        suite_id: suiteId,
        execution_id: executionId,
        reason,
        pinned_by: pinnedBy,
        expected_score_count: expectedScoreCount,
      } = request.body;
      const { evalBaselines } = getInternalServices();
      const spaceId = (await context.agentBuilder).spaces.getSpaceId();
      const baselineId = deterministicBaselineId(spaceId, suiteId, executionId);

      try {
        // An already-pinned baseline promotes its stored snapshot without reading the live
        // scores: rollback must not depend on data it will not use. The source scores may
        // have aged out of retention, grown past the snapshot limit, or gained a second
        // judge since the snapshot was taken — none of which invalidates the stored pin.
        const repinned = await evalBaselines.repin({
          baselineId,
          pinnedBy: pinnedBy ?? null,
          reason: reason ?? null,
          expectedScoreCount,
        });
        if (repinned) {
          return response.ok({ body: { baseline: repinned } });
        }
      } catch (error) {
        if (error instanceof PinnedBaselineScoreCountMismatchError) {
          return response.badRequest({ body: { message: error.message } });
        }
        throw error;
      }

      const [, startDeps] = await coreSetup.getStartServices();
      const evaluationScoreService = startDeps.evals?.evaluationScoreService;
      if (!evaluationScoreService) {
        return response.customError({
          statusCode: 501,
          body: {
            message:
              'Pinning a baseline reads the execution scores through the evals plugin, which is ' +
              'not available on this Kibana. Set xpack.evals.enabled=true and xpack.evals.mode=full.',
          },
        });
      }

      const searchResponse = await evaluationScoreService.search({
        query: buildExperimentFilterQuery(executionId, {
          suiteId,
          filterField: 'metadata.execution_id',
          spaceId,
        }),
        sort: SCORES_SORT_ORDER,
        size: MAX_PINNABLE_SCORES,
        track_total_hits: true,
        // A failed shard would otherwise pass the total-vs-hits check below and publish a
        // permanently incomplete snapshot.
        allow_partial_search_results: false,
        // The same fields the compare flow reads scores without; keeps the snapshot small.
        _source_excludes: UNBOUNDED_SCORE_FIELDS,
      });

      const hits = searchResponse.hits?.hits ?? [];

      // A truncated snapshot would silently lose the overflow forever once the source
      // scores age out of retention, so refuse to pin instead.
      const rawTotal = searchResponse.hits?.total;
      const totalScores = typeof rawTotal === 'number' ? rawTotal : rawTotal?.value;
      if (totalScores != null && totalScores > hits.length) {
        return response.badRequest({
          body: {
            message:
              `Execution "${executionId}" has ${totalScores} scores, more than the ` +
              `${MAX_PINNABLE_SCORES} a baseline snapshot can hold. Pin a run with fewer ` +
              `scores (e.g. fewer repetitions).`,
          },
        });
      }
      const scores = hits.flatMap((hit) =>
        hit._id != null && hit._source != null
          ? [{ id: hit._id, document: hit._source as unknown as EvaluationScoreDocument }]
          : []
      );

      if (scores.length === 0) {
        return response.notFound({
          body: {
            message: `No scores found for execution "${executionId}" in suite "${suiteId}". The run may not have exported scores yet, or they aged out of retention.`,
          },
        });
      }

      const scoreDocuments = scores.map(({ document }) => document);

      // A baseline is only comparable to runs scored by one and the same judge, so a
      // mixed-judge execution cannot serve as one.
      const judgeModelIds = resolveJudgeModelIds(scoreDocuments);
      if (judgeModelIds.length > 1) {
        return response.badRequest({
          body: {
            message:
              `Execution "${executionId}" was scored by multiple judge models ` +
              `(${judgeModelIds.join(', ')}); a pinned baseline requires a single judge.`,
          },
        });
      }

      try {
        const baseline = await evalBaselines.pin({
          pointer: {
            baseline_id: baselineId,
            suite_id: suiteId,
            execution_id: executionId,
            task_model: scoreDocuments[0].task.model,
            judge_model_id: judgeModelIds[0] ?? null,
            git_branch: scoreDocuments[0].metadata?.git?.branch ?? null,
            git_commit_sha: scoreDocuments[0].metadata?.git?.commit_sha ?? null,
            pinned_by: pinnedBy ?? null,
            reason: reason ?? null,
          },
          scores,
          spaceIds: [spaceId],
          expectedScoreCount,
        });

        return response.ok({ body: { baseline } });
      } catch (error) {
        if (error instanceof PinnedBaselineScoreCountMismatchError) {
          return response.badRequest({ body: { message: error.message } });
        }
        throw error;
      }
    })
  );

  router.get(
    {
      path: EVAL_BASELINES_LATEST_URL,
      security: {
        authz: {
          // Baselines are snapshots of evals scores, so reading them demands the evals
          // read privilege, which the evaluations-cluster API keys already carry.
          requiredPrivileges: [EVALS_API_PRIVILEGES.read],
        },
      },
      options: { access: 'internal' },
      validate: {
        query: buildRouteValidationWithZod(GetLatestPinnedBaselineRequestQuery),
      },
    },
    wrapHandler(async (context, request, response) => {
      const { suite_id: suiteId, model_id: modelId } = request.query;
      const { evalBaselines } = getInternalServices();
      const spaceId = (await context.agentBuilder).spaces.getSpaceId();

      const baseline = await evalBaselines.findLatest({ suiteId, modelId, spaceId });

      // 200 with a null baseline: "nothing pinned yet" is an answer, not an error, and the
      // client must be able to tell it apart from a Kibana that lacks these routes (404).
      return response.ok({ body: { baseline: baseline ?? null } });
    })
  );

  router.get(
    {
      path: EVAL_BASELINE_SCORES_URL,
      security: {
        authz: {
          requiredPrivileges: [EVALS_API_PRIVILEGES.read],
        },
      },
      options: { access: 'internal' },
      validate: {
        params: buildRouteValidationWithZod(GetPinnedBaselineScoresRequestParams),
      },
    },
    wrapHandler(async (context, request, response) => {
      const { baselineId } = request.params;
      const { evalBaselines } = getInternalServices();
      const spaceId = (await context.agentBuilder).spaces.getSpaceId();

      try {
        const scores = await evalBaselines.getScores({ baselineId, spaceId });
        if (!scores) {
          return response.notFound({
            body: { message: `No pinned baseline found for id "${baselineId}".` },
          });
        }
        return response.ok({ body: { scores, total: scores.length } });
      } catch (error) {
        if (isMaximumResponseSizeExceededError(error)) {
          logger.warn(
            `Get pinned baseline scores: Elasticsearch response exceeded the maximum size Kibana can process`,
            { error }
          );
          return response.badRequest({
            body: { message: `The response is too large to process. error: ${error.message}` },
          });
        }
        throw error;
      }
    })
  );
}
