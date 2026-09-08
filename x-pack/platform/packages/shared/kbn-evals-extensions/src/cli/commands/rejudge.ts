/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { createFailError, createFlagError } from '@kbn/dev-cli-errors';
import type { Command } from '@kbn/dev-cli-runner';
import {
  envFromDatasetsProfile,
  createCorrectnessAnalysisEvaluator,
  createQuantitativeCorrectnessEvaluators,
  createGroundednessAnalysisEvaluator,
  createQuantitativeGroundednessEvaluator,
  createCriteriaEvaluator,
  type EvaluationCriterion,
} from '@kbn/evals';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import type { HttpHandler } from '@kbn/core/public';
import { createRestClient } from '@kbn/inference-plugin/common';
import { loadMatrixConfig } from '../../matrix/load_matrix_config';
import { planReplay, summarizePlan, type ReplayCell } from '../../matrix/replay_plan';
import { fetchScoreDocs } from '../../matrix/fetch_score_docs';
import { anonymizeCell, buildAliasMap } from '../../matrix/anonymize_cell';
import { runRejudge, type CellJudge, type RejudgeScore } from '../../matrix/run_rejudge';
import {
  collectExamples,
  selectAdapter,
  buildStructuredReferences,
  REFERENCE_ADAPTERS,
} from '../../matrix/reference_adapters';
import { selectJury, checkJuryCoverage, JURY_ADAPTERS } from '../../matrix/jury_adapters';
import type { JuryAdapter, JuryArgs } from '../../matrix/jury_adapters';

const DEFAULT_OUT_DIR = 'target/llm_matrix_rejudge';

/**
 * Load `exampleId -> reference` from a suite dataset module.
 *
 * Golden score documents carry an empty `example.output`, so the ground truth a
 * correctness judge compares against exists only in the suite's dataset. A
 * replay without it grades every answer against an empty reference and
 * manufactures uniform inaccuracy verdicts.
 */
async function loadReferences(
  datasetPath: string,
  log?: { info: (msg: string) => void }
): Promise<{
  references: Map<string, string>;
  structured: Map<string, Record<string, unknown>>;
  adapterName: string;
}> {
  const resolved = Path.resolve(process.cwd(), datasetPath);
  if (!Fs.existsSync(resolved)) {
    throw createFlagError(`--dataset path does not exist: ${resolved}`);
  }

  const mod = await import(resolved);
  const examples = collectExamples(mod as Record<string, unknown>);

  if (examples.length === 0) {
    throw createFlagError(
      `--dataset module ${resolved} does not export an examples array ` +
        `(looked for ${[...new Set(REFERENCE_ADAPTERS.flatMap((a) => a.exportNames))].join(', ')})`
    );
  }

  // Each suite states ground truth in its own shape; pick the adapter whose
  // contract these examples actually satisfy rather than assuming a reference
  // string exists.
  const adapter = selectAdapter(examples);
  if (!adapter) {
    throw createFlagError(
      `--dataset module ${resolved} matches no reference adapter ` +
        `(tried: ${REFERENCE_ADAPTERS.map((a) => a.name).join(', ')}). ` +
        `Add an adapter in matrix/reference_adapters.ts for this suite.`
    );
  }

  const references = adapter.build(examples);
  log?.info(`Reference adapter "${adapter.name}" resolved ${references.size} example(s)`);

  if (references.size === 0) {
    throw createFlagError(
      `--dataset module ${resolved} yielded no example references via the ` +
        `"${adapter.name}" adapter`
    );
  }

  return {
    references,
    structured: buildStructuredReferences(examples),
    adapterName: adapter.name,
  };
}

export const rejudgeCmd: Command<any> = {
  name: 'rejudge',
  description: `
    Re-grade already-recorded trajectories with a different judge.

    Reads stored agent outputs from the evals cluster and re-runs only the
    LLM-judged evaluators. No agent, Kibana stack, or seeded data is needed:
    every input a judge reads is durable in the score documents. Trace-based
    evaluators (SkillInvoked, tokens, latency) are unaffected by a judge swap
    and are left on their source run rather than recomputed.

    Results are written to a local JSON artifact for inspection.
  `,
  flags: {
    string: [
      'config',
      'judge',
      'dataset',
      'out',
      'models',
      'concurrency',
      'as-of',
      'execution-id',
      'from-matrix',
      'profile',
      'suite',
    ],
    boolean: ['blind', 'dry-run'],
    help: `
      --config           Matrix config JSON (selects models/suites).
      --judge            Judge tag recorded on results, e.g. "haiku". Required.
      --dataset          Path to the suite dataset module supplying references. Required.
      --suite            Suite id selecting the jury (evaluator set) to recompute.
                         Defaults to the jury matching the dataset's reference adapter.
      --from-matrix      scores.debug.json from a rendered matrix; re-judges
                         exactly the executions that matrix published
      --execution-id     Re-judge specific execution ids (comma separated).
      --models           Restrict to these model ids (comma separated).
      --blind            Strip model identity before judging.
      --dry-run          Plan only: report cell counts and cost, call no judge.
      --concurrency      Parallel judge calls (default 5).
      --out              Output directory (default ${DEFAULT_OUT_DIR}).
      --profile          Golden-cluster config profile providing EVAL_KBN_URL/API_KEY.
      --as-of            Only replay runs recorded before this ISO timestamp.
    `,
  },
  run: async ({ log, flagsReader }) => {
    const judgeTag = flagsReader.string('judge');
    if (!judgeTag) {
      throw createFlagError('--judge is required so re-judged scores stay separable');
    }

    const datasetPath = flagsReader.string('dataset');
    if (!datasetPath) {
      throw createFlagError('--dataset is required: golden documents carry no ground truth');
    }

    const configPath = flagsReader.string('config');
    const blind = flagsReader.boolean('blind');
    const dryRun = flagsReader.boolean('dry-run');
    const outDir = flagsReader.string('out') ?? DEFAULT_OUT_DIR;
    const concurrency = Number(flagsReader.string('concurrency') ?? '5');
    const asOfFlag = flagsReader.string('as-of');
    if (asOfFlag && Number.isNaN(Date.parse(asOfFlag))) {
      throw createFlagError(`--as-of must be an ISO date, got "${asOfFlag}"`);
    }

    const explicitExecutionIds: string[] = (flagsReader.string('execution-id') ?? '')
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
    const modelFilter = new Set<string>(
      (flagsReader.string('models') ?? '')
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
    );

    const config = configPath ? loadMatrixConfig(configPath) : undefined;
    const { references, structured, adapterName } = await loadReferences(datasetPath, log);
    log.info(`Loaded ${references.size} dataset reference(s) from ${datasetPath}`);

    // The jury is resolved from the suite the scores belong to, not from the
    // dataset path. An unregistered suite is a hard error: falling back to the
    // persona jury is what silently produced Factuality/Relevance verdicts for
    // an Attack Discovery replay, which look like scores but grade the wrong
    // artefact with the wrong rubric.
    const suiteFlag = flagsReader.string('suite');
    const jury = selectJury(suiteFlag ?? adapterName);
    if (!jury) {
      throw createFlagError(
        `No jury adapter for suite "${suiteFlag ?? adapterName}". ` +
          `Known juries: ${JURY_ADAPTERS.map((j) => `${j.name} (${j.suiteIds.join(', ')})`).join(
            '; '
          )}. Add one in matrix/jury_adapters.ts rather than replaying with a ` +
          `jury built for a different suite.`
      );
    }
    log.info(`Jury "${jury.name}" recomputes: ${jury.evaluatorNames.join(', ')}`);

    // Only consult the profile when one was asked for: envFromDatasetsProfile
    // shells out to Vault, which blocks for minutes when no Vault is reachable.
    const profileFlag = flagsReader.string('profile') ?? undefined;
    const profileEnv = profileFlag ? envFromDatasetsProfile(REPO_ROOT, profileFlag) : {};
    const evaluationsKbnUrl = profileEnv.EVAL_KBN_URL ?? process.env.EVAL_KBN_URL;
    const evaluationsKbnApiKey = profileEnv.EVAL_KBN_API_KEY ?? process.env.EVAL_KBN_API_KEY;

    // Read score documents straight from Elasticsearch rather than through the
    // evals plugin API: the golden cluster stores the data but does not run the
    // plugin (/internal/evals answers 400 "not available with the current
    // configuration"), so the API path cannot reach the archive being replayed.
    const esUrl = process.env.GOLDEN_ES_URL;
    const esApiKey = process.env.GOLDEN_ES_API_KEY;
    if (!esUrl || !esApiKey) {
      throw createFlagError(
        'GOLDEN_ES_URL and GOLDEN_ES_API_KEY must point at the cluster holding the scores.'
      );
    }

    // Which runs to re-judge is not a model filter. A model can have a dozen
    // archived reruns (25 config model ids match 136 executions), so filtering
    // by model would grade runs the matrix never published.
    //
    // queryMatrixScores cannot make this selection here: it needs an
    // EvalsClient, and the golden cluster does not run the evals plugin. The
    // rendered matrix already records the executions it published, so the
    // replay reuses that artifact and grades exactly those trajectories.
    let executionIds: string[] | undefined = explicitExecutionIds.length
      ? explicitExecutionIds
      : undefined;

    const matrixDebugPath = flagsReader.string('from-matrix');
    if (!executionIds && matrixDebugPath) {
      const resolved = Path.resolve(process.cwd(), matrixDebugPath);
      if (!Fs.existsSync(resolved)) {
        throw createFlagError(`--from-matrix path does not exist: ${resolved}`);
      }

      const debug = JSON.parse(Fs.readFileSync(resolved, 'utf8')) as Array<{
        modelId: string;
        suites: Array<{ experimentId: string }>;
      }>;

      executionIds = [
        ...new Set(
          debug
            .filter((row) => modelFilter.size === 0 || modelFilter.has(row.modelId))
            .flatMap((row) => row.suites.map((suite) => suite.experimentId))
        ),
      ];

      log.info(`Selected ${executionIds.length} published execution(s) from ${matrixDebugPath}`);
    }

    const docs = await fetchScoreDocs({
      esUrl,
      apiKey: esApiKey,
      exampleIds: [...references.keys()],
      executionIds,
      modelIds: modelFilter.size > 0 ? [...modelFilter] : undefined,
      configModelIds: config?.models.flatMap((m) => [m.id, ...(m.matchIds ?? [])]),
      suiteIds: config ? [...new Set(config.columns.flatMap((c) => c.suites))] : [...jury.suiteIds],
      asOf: asOfFlag ? Date.parse(asOfFlag) : undefined,
    });
    log.info(`Fetched ${docs.length} score document(s) from ${esUrl}`);

    // planReplay both builds the judgeable cells and reports why the rest are
    // unusable. A second extractor over the same documents could silently
    // disagree with the plan it is reported alongside.
    const plan = planReplay(docs as never[], (id) => references.get(id), {
      jury,
      structuredReferenceFor: (id) => structured.get(id),
    });
    const cellsToJudge = plan.cells;
    log.info(`Replay plan: ${summarizePlan(plan)}`);

    if (plan.skipped.length > 0) {
      log.warning(`${plan.skipped.length} cell(s) cannot be replayed:`);
      for (const issue of plan.skipped.slice(0, 10)) {
        log.warning(`  ${issue.executionId} / ${issue.exampleId}: ${issue.reason}`);
      }
    }

    if (dryRun) {
      log.info('--dry-run: no judge was called and nothing was written.');
      return;
    }

    if (cellsToJudge.length === 0) {
      throw createFailError('Replay plan is empty; refusing to write an empty rejudge artifact.');
    }

    const aliases = buildAliasMap(cellsToJudge);
    const cells: ReplayCell[] = blind
      ? cellsToJudge.map((cell) => anonymizeCell(cell, aliases))
      : cellsToJudge;

    const connectorId = process.env.EVAL_CONNECTOR_ID;
    if (!connectorId) {
      throw createFlagError(
        'EVAL_CONNECTOR_ID must name the judge connector, e.g. eis-anthropic-claude-4-5-haiku'
      );
    }

    // The judge runs against a Kibana that HAS the connector configured. That is
    // a live eval stack, not the golden archive the scores were read from, so it
    // is addressed separately.
    const judgeKbnUrl = process.env.JUDGE_KBN_URL ?? evaluationsKbnUrl;
    if (!judgeKbnUrl) {
      throw createFlagError('JUDGE_KBN_URL must point at a Kibana exposing the judge connector.');
    }

    const judge: CellJudge = createInferenceJudge({
      kbnUrl: judgeKbnUrl,
      apiKey: process.env.JUDGE_KBN_API_KEY ?? evaluationsKbnApiKey,
      connectorId,
      jury,
      log,
    });

    const { results, failures } = await runRejudge({
      cells,
      judge,
      judgeTag: blind ? `${judgeTag}-blind` : judgeTag,
      concurrency,
    });

    // A replay that produced none of the jury's evaluators has measured
    // something other than the column it claims to refresh. Failing here stops
    // an artifact that would look publishable but silently swap the instrument.
    const coverage = checkJuryCoverage(
      jury,
      results.flatMap((r) => r.scores)
    );
    if (!coverage.ok && results.length > 0) {
      throw createFailError(
        `Rejudge produced no "${jury.name}" evaluators ` +
          `(expected any of ${jury.evaluatorNames.join(', ')}; got ${
            coverage.unexpected.join(', ') || 'nothing'
          }). Refusing to write an artifact that does not refresh this suite's column.`
      );
    }
    if (coverage.missing.length > 0) {
      log.warning(
        `Jury "${jury.name}" did not produce: ${coverage.missing.join(', ')} ` +
          `(examples lacking that annotation are skipped by the evaluator).`
      );
    }

    Fs.mkdirSync(outDir, { recursive: true });
    const outFile = Path.join(outDir, `rejudge-${judgeTag}${blind ? '-blind' : ''}.json`);
    Fs.writeFileSync(
      outFile,
      JSON.stringify(
        {
          judgeTag,
          blind,
          generatedAt: new Date().toISOString(),
          planned: plan.cells.length,
          judged: results.length,
          failures,
          skipped: plan.skipped,
          results,
        },
        null,
        2
      )
    );

    log.success(`Wrote ${results.length} re-judged cell(s) to ${outFile}`);
    if (failures.length > 0) {
      log.warning(`${failures.length} cell(s) failed to judge; see "failures" in the artifact.`);
    }
  },
};

/**
 * Build a judge backed by the real inference REST API.
 *
 * `createRestClient` needs only an `HttpHandler`, so the judges run from a
 * plain CLI against a Kibana that has the connector — no Playwright worker,
 * no Scout stack, no seeded data.
 */
function createInferenceJudge({
  kbnUrl,
  apiKey,
  connectorId,
  jury,
  log,
}: {
  kbnUrl: string;
  apiKey?: string;
  connectorId: string;
  jury: JuryAdapter;
  log: ToolingLog;
}): CellJudge {
  const fetchImpl = (async (path: string, options: any = {}) => {
    const response = await fetch(`${kbnUrl.replace(/\/$/, '')}${path}`, {
      method: options.method ?? 'POST',
      headers: {
        'Content-Type': 'application/json',
        'kbn-xsrf': 'evals-rejudge',
        ...(apiKey ? { Authorization: `ApiKey ${apiKey}` } : {}),
        ...(options.headers ?? {}),
      },
      ...(options.body ? { body: options.body } : {}),
      ...(options.signal ? { signal: options.signal } : {}),
    });

    if (!response.ok) {
      throw new Error(`inference ${path} responded ${response.status}: ${await response.text()}`);
    }
    return response.json();
  }) as unknown as HttpHandler;

  const inferenceClient = createRestClient({ fetch: fetchImpl, bindTo: { connectorId } });

  // Each jury builds the evaluators its suite's column is actually made of.
  // The persona pair is no longer assumed: running it against a suite that
  // grades something else produces confident verdicts about the wrong artefact.
  const evaluate = buildJuryEvaluator({ jury, inferenceClient, log });

  return async (cell) => {
    const args = jury.toArgs(cell);
    if (!args) {
      // planReplay filters these out, so reaching here means the plan and the
      // jury disagree -- fail loudly rather than emit an empty score set that
      // would average into the column as if the model had performed badly.
      throw new Error(
        `Cell ${cell.executionId}/${cell.exampleId} is not gradable by the "${jury.name}" jury`
      );
    }
    return evaluate(args);
  };
}

/**
 * Build the scoring function for a jury.
 *
 * persona-matrix keeps its two-stage shape: the correctness and groundedness
 * analyses run once, then the quantitative evaluators read those analyses off
 * the output rather than paying for a second judge call.
 *
 * attack-discovery runs its own Criteria and Rubric evaluators, which need a
 * `DefaultEvaluators.criteria` factory rather than a pre-built evaluator, since
 * the criteria list differs per example.
 */
function buildJuryEvaluator({
  jury,
  inferenceClient,
  log,
}: {
  jury: JuryAdapter;
  inferenceClient: BoundInferenceClient;
  log: ToolingLog;
}): (args: JuryArgs) => Promise<{ scores: RejudgeScore[]; analyses?: Record<string, unknown> }> {
  if (jury.name === 'attack-discovery') {
    // AD's Criteria and Rubric evaluators live in a private, solutions-side
    // functional-tests package that a platform package must not import. Both
    // are thin wrappers over the shared criteria judge, so the jury rebuilds
    // them from the same primitive rather than inverting the dependency.
    // The rubric is mirrored from the suite; see jury_adapters.ts.
    return async (args) => {
      const scores: RejudgeScore[] = [];
      for (const spec of jury.criteriaFor?.(args) ?? []) {
        const evaluator = createCriteriaEvaluator({
          inferenceClient,
          criteria: spec.criteria as EvaluationCriterion[],
          log,
        });
        const result = await evaluator.evaluate(spec.args as never);
        scores.push({
          name: spec.name,
          score: result?.score ?? null,
          label: result?.label ?? undefined,
          explanation: result?.explanation ?? undefined,
        });
      }
      return { scores };
    };
  }

  const correctness = createCorrectnessAnalysisEvaluator({ inferenceClient, log });
  const groundedness = createGroundednessAnalysisEvaluator({ inferenceClient, log });
  const quantitative = [
    ...createQuantitativeCorrectnessEvaluators(),
    createQuantitativeGroundednessEvaluator(),
  ];

  return async (args) => {
    const [correctnessResult, groundednessResult] = await Promise.all([
      correctness.evaluate(args as never),
      groundedness.evaluate(args as never),
    ]);

    // The quantitative evaluators are pure functions of the two analyses, so
    // they read them off the output rather than calling the judge again.
    const enriched = {
      ...args,
      output: {
        ...args.output,
        correctnessAnalysis: correctnessResult?.metadata,
        groundednessAnalysis: groundednessResult?.metadata,
      },
    };

    const scores: RejudgeScore[] = [];
    for (const evaluator of quantitative) {
      const result = await evaluator.evaluate(enriched as never);
      scores.push({
        name: evaluator.name ?? 'unknown',
        score: result?.score ?? null,
        label: result?.label ?? undefined,
        explanation: result?.explanation ?? undefined,
      });
    }

    return {
      scores,
      analyses: {
        correctness: correctnessResult?.metadata,
        groundedness: groundednessResult?.metadata,
      },
    };
  };
}
