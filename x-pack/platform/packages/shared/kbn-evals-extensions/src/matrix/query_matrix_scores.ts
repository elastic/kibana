/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import type { EvaluationExperimentSummary, EvaluationScoreDocument } from '@kbn/evals-common';
import { MAX_LIST_EXPERIMENTS, type EvalsClient, type ExperimentStats } from '@kbn/evals';
import { isEisBacked, describeJudge } from './judge_provenance';
import { VERDICT_LADDERS, scoreVerdict } from './jury';

/**
 * Counts of score documents dropped by the provenance/verdict policy, so the
 * report can state what was excluded instead of silently shrinking its own
 * sample.
 */
export interface ExcludedScoreCounts {
  nonEis: number;
  selfJudged: number;
  unmappedVerdict: number;
}

export interface ScoreAggregationOptions {
  /** Drop scores from judges that are not EIS-backed connectors. */
  requireEisJudge?: boolean;
  /** Drop scores where the judge and the graded model are the same id. */
  excludeSelfJudged?: boolean;
  /**
   * Score the judge's categorical verdict via an ordinal ladder instead of its
   * continuous value. Measured on the persona matrix: judged-score flip across
   * identical repetitions drops from 83.3% to 33.3%, because the agent's prose
   * changes every run while its verdict does not.
   */
  useVerdictLadder?: boolean;
  onExcluded?: (counts: ExcludedScoreCounts) => void;
}

/**
 * Where each judged evaluator stores its categorical verdict. These paths are
 * taken from live score documents, not inferred: Groundedness writes
 * `groundednessAnalysis.summary_verdict`, while Factuality and Relevance both
 * hang off the shared `correctnessAnalysis.summary` block under different keys.
 */
const VERDICT_PATHS: Record<string, [string, string]> = {
  Groundedness: ['groundednessAnalysis', 'summary_verdict'],
  Factuality: ['correctnessAnalysis', 'factual_accuracy_summary'],
  Relevance: ['correctnessAnalysis', 'relevance_summary'],
};

/**
 * Ladder score for a judged evaluator, or the stored continuous score for
 * evaluators with no verdict vocabulary (contract evaluators are already
 * deterministic and have nothing to gain from the ladder).
 */
function resolveVerdictScore(
  evaluatorName: string,
  doc: EvaluationScoreDocument
): number | null | undefined {
  const ladder = VERDICT_LADDERS[evaluatorName];
  const path = VERDICT_PATHS[evaluatorName];
  if (!ladder || !path) {
    return doc.evaluator?.score;
  }

  const [blockKey, verdictKey] = path;
  const metadata = doc.evaluator?.metadata as Record<string, unknown> | undefined;
  const block = metadata?.[blockKey] as Record<string, unknown> | undefined;
  // Groundedness puts its verdict at the top of the block; the correctness
  // evaluators nest theirs one level deeper under `summary`.
  const summary = (block?.summary as Record<string, unknown> | undefined) ?? block;
  const verdict = summary?.[verdictKey];

  const mapped = scoreVerdict(typeof verdict === 'string' ? verdict : undefined, ladder);
  return mapped ?? undefined;
}

/** Aggregated evaluator score for a single dataset within a suite. */
export interface AggregatedEvaluatorScore {
  evaluatorName: string;
  mean: number;
  count: number;
  /** Observed spread across the experiment's examples (used by the token axis). */
  min?: number;
  max?: number;
}

export interface AggregatedDatasetScores {
  datasetId: string;
  datasetName: string;
  evaluators: AggregatedEvaluatorScore[];
}

export interface AggregatedSuiteScores {
  suiteId: string;
  experimentId: string;
  timestamp?: string;
  datasets: AggregatedDatasetScores[];
}

export interface AggregatedModelScores {
  modelId: string;
  family?: string;
  provider?: string;
  suites: AggregatedSuiteScores[];
  /**
   * Scores that existed for this model but were rejected by judge policy.
   * Present only when at least one score was dropped. A model with `suites`
   * empty AND this set ran successfully — its grades were untrustworthy — so
   * re-running it is wasted compute until the judge assignment is fixed.
   */
  excluded?: ExcludedScoreCounts;
}

export interface QueryMatrixScoresOptions {
  suiteIds: string[];
  /**
   * Task model ids to include (the config's `id` + `matchIds` per model).
   * Each (suite, model) pair is queried separately via the route's `model_id`
   * term filter, so a bounded single-page listing covers the full history for
   * that pair instead of paging an ever-growing cross-model aggregation.
   */
  modelIds: string[];
  branch?: string;
  /**
   * Per-suite branch overrides, keyed by suite id. A suite listed here is read
   * from its mapped branch instead of the global `branch`.
   */
  branchBySuite?: Record<string, string>;
  lookbackDays?: number;
  /**
   * When any config column sets `examplePrefixes`, per-example score documents
   * are fetched (stripped experiment-scores route — unbounded fields excluded)
   * and bucketed into synthetic per-prefix datasets alongside the dataset-level
   * stats, so columns can slice a single dataset by example category.
   */
  examplePrefixes?: string[];
  /**
   * Judged-evaluator scoring policy. Forwarded to `scoresByPrefixToDatasets`
   * for the per-prefix datasets. Omitted means the historical behaviour:
   * continuous scores, every judge counted.
   */
  scoring?: ScoreAggregationOptions;
}

/**
 * Buckets stripped per-example score documents into synthetic per-prefix
 * datasets. Each doc carries `example.id` (e.g. `alert-analysis-b`) and
 * `evaluator.{name,score}`; docs are grouped by prefix, then per-evaluator
 * means are computed the same way the server-side stats route would.
 * Pure for unit testing.
 */
export const scoresByPrefixToDatasets = (
  scores: EvaluationScoreDocument[],
  prefixes: string[],
  options: ScoreAggregationOptions = {}
): AggregatedDatasetScores[] => {
  const byPrefix = new Map<string, Map<string, { sum: number; count: number }>>();
  const excluded: ExcludedScoreCounts = { nonEis: 0, selfJudged: 0, unmappedVerdict: 0 };

  for (const doc of scores) {
    const exampleId = doc.example?.id ?? '';
    const prefix = prefixes.find((p) => exampleId === p || exampleId.startsWith(`${p}-`));
    if (!prefix) {
      continue;
    }
    const evaluatorName = doc.evaluator?.name;
    if (!evaluatorName) {
      continue;
    }

    const judgeId = doc.evaluator?.model?.id;
    const taskModelId = doc.task?.model?.id;
    if (options.requireEisJudge && judgeId && !isEisBacked(judgeId)) {
      excluded.nonEis += 1;
      continue;
    }
    if (
      options.excludeSelfJudged &&
      judgeId &&
      taskModelId &&
      describeJudge(judgeId, taskModelId).selfJudged
    ) {
      excluded.selfJudged += 1;
      continue;
    }

    const score = options.useVerdictLadder
      ? resolveVerdictScore(evaluatorName, doc)
      : doc.evaluator?.score;

    if (typeof score !== 'number') {
      if (options.useVerdictLadder && typeof doc.evaluator?.score === 'number') {
        excluded.unmappedVerdict += 1;
      }
      continue;
    }

    let evaluators = byPrefix.get(prefix);
    if (!evaluators) {
      evaluators = new Map();
      byPrefix.set(prefix, evaluators);
    }
    const agg = evaluators.get(evaluatorName) ?? { sum: 0, count: 0 };
    agg.sum += score;
    agg.count += 1;
    evaluators.set(evaluatorName, agg);
  }

  options.onExcluded?.(excluded);

  return [...byPrefix.entries()].map(([prefix, evaluators]) => ({
    datasetId: `prefix:${prefix}`,
    datasetName: prefix,
    evaluators: [...evaluators.entries()].map(([evaluatorName, agg]) => ({
      evaluatorName,
      mean: agg.sum / agg.count,
      count: agg.count,
    })),
  }));
};

/**
 * Selects, per task model, the most recent experiment from a list (typically
 * the newest experiments for one suite + model). Experiments without a model
 * id or timestamp older than the lookback window are ignored. Pure for unit
 * testing.
 */
export const pickLatestExperimentPerModel = (
  experiments: EvaluationExperimentSummary[],
  { lookbackDays, now = Date.now() }: { lookbackDays?: number; now?: number } = {}
): Map<string, EvaluationExperimentSummary> => {
  const cutoff = lookbackDays ? now - lookbackDays * 24 * 60 * 60 * 1000 : undefined;
  const latestByModel = new Map<string, { experiment: EvaluationExperimentSummary; at: number }>();

  for (const experiment of experiments) {
    const modelId = experiment.task_model?.id;
    if (!modelId) {
      continue;
    }

    const at = Date.parse(experiment.timestamp);
    // An unparseable timestamp must not be treated as epoch 0, or stale
    // experiments would silently survive the lookback cutoff.
    if (!Number.isFinite(at) || (cutoff !== undefined && at < cutoff)) {
      continue;
    }

    // Selection runs before scoring, so a self-judged experiment picked here
    // blanks the model outright: its scores are dropped downstream and the
    // older, independently judged runs are never reconsidered. Skip it now so
    // recency cannot silently cost a model every cell it earned.
    const judges = experiment.evaluator_models?.length
      ? experiment.evaluator_models
      : [experiment.evaluator_model];
    if (judges.some((judge) => judge?.id && describeJudge(judge.id, modelId).selfJudged)) {
      continue;
    }

    const existing = latestByModel.get(modelId);
    if (!existing || at > existing.at) {
      latestByModel.set(modelId, { experiment, at });
    }
  }

  return new Map([...latestByModel].map(([modelId, { experiment }]) => [modelId, experiment]));
};

/**
 * Converts the per-experiment stats returned by the evals plugin into the
 * dataset-grouped structure consumed by the matrix builder. Pure for testing.
 */
export const experimentStatsToDatasets = (stats: ExperimentStats): AggregatedDatasetScores[] => {
  const byDataset = new Map<string, AggregatedDatasetScores>();

  for (const stat of stats.stats) {
    let dataset = byDataset.get(stat.datasetId);
    if (!dataset) {
      dataset = { datasetId: stat.datasetId, datasetName: stat.datasetName, evaluators: [] };
      byDataset.set(stat.datasetId, dataset);
    }
    dataset.evaluators.push({
      evaluatorName: stat.evaluatorName,
      mean: stat.stats.mean,
      count: stat.stats.count,
      min: stat.stats.min,
      max: stat.stats.max,
    });
  }

  return [...byDataset.values()];
};

/**
 * Queries the evals plugin for the latest experiment per (model, suite) and
 * returns mean evaluator scores grouped by dataset, ready for `buildMatrix`.
 *
 * Each (suite, model) pair is listed separately through the route's `model_id`
 * term filter: the route answers with a terms aggregation whose bucket size
 * grows with `page * per_page`, so a bounded single page per pair is the only
 * query shape that scales. The newest experiment within the lookback window is
 * then picked client-side (a bare `per_page: 1` request could not express the
 * lookback fallback).
 */
export const queryMatrixScores = async (
  evalsClient: EvalsClient,
  log: SomeDevLog,
  {
    suiteIds,
    modelIds,
    branch,
    branchBySuite,
    lookbackDays,
    examplePrefixes = [],
    scoring,
  }: QueryMatrixScoresOptions
): Promise<AggregatedModelScores[]> => {
  const byModel = new Map<string, AggregatedModelScores>();
  /**
   * Per-model tally of scores rejected by judge policy, keyed by model id.
   * Lets the renderer distinguish a never-run cell from one whose grades were
   * all thrown away — the two are indistinguishable otherwise.
   */
  const excludedByModel = new Map<string, ExcludedScoreCounts>();
  const exampleCoverage: Array<{ modelId: string; suiteId: string; examples: number }> = [];

  for (const suiteId of suiteIds) {
    const suiteBranch = branchBySuite?.[suiteId] ?? branch;
    for (const modelId of modelIds) {
      const experiments = await evalsClient.listExperiments({
        suiteId,
        taskModelId: modelId,
        branch: suiteBranch,
        limit: MAX_LIST_EXPERIMENTS,
      });
      const [latest] = [...pickLatestExperimentPerModel(experiments, { lookbackDays }).values()];

      log.debug(
        `Suite ${suiteId}, model ${modelId}: ${experiments.length} experiment(s)` +
          (latest ? '' : ', none within the lookback window')
      );

      if (!latest) {
        continue;
      }

      // The experiments listing returns `execution_id` as its grouping key; the
      // detail/stats route must be filtered by execution_id (+ suite + model),
      // since a bare experiment_id path lookup targets a different field and 404s.
      const stats = await evalsClient.getExperimentStats(latest.experiment_id, {
        suiteId,
        taskModelId: modelId,
        executionId: latest.execution_id ?? latest.experiment_id,
      });
      if (!stats) {
        log.warning(
          `No stats for experiment ${latest.experiment_id} (suite ${suiteId}, model ${modelId})`
        );
        continue;
      }

      let model = byModel.get(modelId);
      if (!model) {
        model = {
          modelId,
          family: latest.task_model?.family,
          provider: latest.task_model?.provider,
          suites: [],
        };
        byModel.set(modelId, model);
      }

      const datasets = experimentStatsToDatasets(stats);
      // Per-prefix synthetic datasets: one extra stripped-scores fetch per
      // (suite, model). Cheap — unbounded fields are excluded server-side.
      if (examplePrefixes.length > 0) {
        try {
          const scores = await evalsClient.getExperimentScores(latest.experiment_id, {
            suiteId,
            taskModelId: modelId,
            executionId: latest.execution_id ?? latest.experiment_id,
          });
          // Capture WHY scores were dropped. Without this the caller cannot tell
          // "model never ran" from "model ran and every grade was rejected" —
          // they render identically as a blank cell and invite a pointless
          // re-sweep. See references/self-judging-provenance-impact.md.
          const before = datasets.length;
          datasets.push(
            ...scoresByPrefixToDatasets(scores, examplePrefixes, {
              ...scoring,
              onExcluded: (counts) => {
                if (counts.selfJudged + counts.nonEis + counts.unmappedVerdict > 0) {
                  excludedByModel.set(modelId, counts);
                }
              },
            })
          );
          if (datasets.length === before && excludedByModel.has(modelId)) {
            const c = excludedByModel.get(modelId)!;
            // A pure unmapped-verdict rejection is not a judge problem, so do
            // not send the operator to the judge config. Measured cause on
            // attack-discovery: every document carries `example.id` "0", so
            // prefix bucketing matches no column and every score falls out.
            const judgeIssue = c.selfJudged + c.nonEis;
            const remedy =
              judgeIssue === 0
                ? `no score carried a mappable verdict — check that this suite's example ids match the column's examplePrefixes (a suite that writes a constant example id cannot be bucketed) before blaming the judge.`
                : `Re-running this model will NOT fill these cells — fix the judge assignment first.`;
            log.warning(
              `All per-prefix scores rejected for model ${modelId} (suite ${suiteId}): ` +
                `${c.selfJudged} self-judged, ${c.nonEis} non-EIS judge, ${c.unmappedVerdict} unmapped verdict. ` +
                remedy
            );
          }

          // The sweep knows when a run stopped early (docs=252/294) but that
          // fact never reaches the score docs, so an incomplete experiment
          // publishes a headline score indistinguishable from a complete one:
          // 4.5-sonnet ranked 7.49 off 18 of 21 examples on 2026-08-29 while
          // its peers ran all 21. minCoverage only catches near-empty rows.
          // Count the examples this experiment actually carries and say so.
          const exampleIds = new Set(
            scores
              .map((doc) => doc.example?.id)
              .filter((id): id is string => typeof id === 'string')
          );
          if (exampleIds.size > 0) {
            exampleCoverage.push({ modelId, suiteId, examples: exampleIds.size });
          }
        } catch (error) {
          log.warning(
            `Per-prefix scores unavailable for experiment ${
              latest.experiment_id
            } (suite ${suiteId}, model ${modelId}): ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      model.suites.push({
        suiteId,
        experimentId: latest.experiment_id,
        timestamp: latest.timestamp,
        datasets,
      });
    }
  }

  // Treat the count most models reached as the suite's full size rather than
  // hardcoding it: the matrix reads score docs, and the expected example count
  // lives in the eval suite. 18 of 20 models covered all 21 examples on
  // 2026-08-29, so a model below that modal count ran short.
  const bySuite = new Map<string, number[]>();
  for (const entry of exampleCoverage) {
    const list = bySuite.get(entry.suiteId) ?? [];
    list.push(entry.examples);
    bySuite.set(entry.suiteId, list);
  }
  for (const [suiteId, sizes] of bySuite) {
    const tally = new Map<number, number>();
    for (const n of sizes) tally.set(n, (tally.get(n) ?? 0) + 1);
    let full = 0;
    let best = 0;
    for (const [n, c] of tally) {
      if (c > best || (c === best && n > full)) {
        full = n;
        best = c;
      }
    }
    for (const entry of exampleCoverage) {
      if (entry.suiteId === suiteId && entry.examples < full) {
        log.warning(
          `${entry.modelId} scored on ${entry.examples} of ${full} examples in ${suiteId} -- its score rests on an incomplete run and is not comparable to models that ran all ${full}`
        );
      }
    }
  }

  for (const [modelId, counts] of excludedByModel) {
    if (counts.selfJudged > 0) {
      log.warning(
        `${modelId}: dropped ${counts.selfJudged} self-judged score doc(s). ` +
          `Excluding them is correct, but a model judged by itself is not evidence ` +
          `of quality — re-run it against an independent judge to fill those cells.`
      );
    }
  }
  log.debug(`Matrix query resolved ${byModel.size} model(s) across ${suiteIds.length} suite(s)`);
  return [...byModel.values()].map((model) => {
    const excluded = excludedByModel.get(model.modelId);
    return excluded ? { ...model, excluded } : model;
  });
};
