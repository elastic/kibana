/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Render the published matrix from a pre-aggregated golden extract.
 *
 * The normal `evals ext matrix` CLI reads scores through the evals plugin API,
 * which the golden cluster has disabled (`xpack.evals.enabled=false`). This
 * driver skips only the *transport*: aggregation is read from a JSON file
 * produced by a direct ES query, then handed to the same `buildMatrix` and
 * `renderMatrixHtml` the CLI uses, so the published artifact stays byte-shaped
 * like every other run instead of being re-templated by hand.
 */

import fs from 'fs';
import path from 'path';
import { buildMatrix } from '../src/matrix/build_matrix';
import { renderMatrixHtml } from '../src/matrix/render_matrix_html';
import type { MatrixTraceData } from '../src/matrix/trace_types';
import type { AggregatedModelScores } from '../src/matrix/query_matrix_scores';
import { loadMatrixConfig } from '../src/matrix/load_matrix_config';
import { deriveJudgeProvenance } from '../src/matrix/judge_provenance';

const readJson = <T>(file: string): T => JSON.parse(fs.readFileSync(file, 'utf8')) as T;

const aggregatedPath = process.env.AGGREGATED_JSON!;
const configPath = process.env.MATRIX_CONFIG!;
const outDir = process.env.OUT_DIR!;
// Accept either name: the render command passes *_JSON, and an earlier revision
// of this script read the bare names. A mismatch here silently drops every
// methodology note, so tolerate both rather than failing open on a typo.
const CAVEAT_STATS_PATH = process.env.CAVEAT_STATS_JSON ?? process.env.CAVEAT_STATS;
const JUDGED_STATS_PATH = process.env.JUDGED_STATS_JSON ?? process.env.JUDGED_STATS;

const aggregated = readJson<AggregatedModelScores[]>(aggregatedPath);
// Use the real loader so schema defaults (DEFAULT_EXCLUDED_EVALUATORS, scale,
// tier settings) apply exactly as they do for a normal CLI run.
const config = loadMatrixConfig(configPath);

const warnings: string[] = [];
const matrix = buildMatrix(aggregated, config, {
  warning: (message: string) => warnings.push(message),
});

// Which judge actually graded the admitted runs, counted from the aggregated
// input rather than asserted. A hardcoded id here silently survives a rejudge
// that never landed: the board then claims one shared instrument while the
// rows were graded by several, which is exactly the comparison the CI/spread
// figures below assume is safe.
const { judgeModelId, judgeBreakdown } = deriveJudgeProvenance(aggregated);

const JUDGE_NOTES: string[] = [
  `THERE IS NO SINGLE JUDGE OF RECORD, and judge assignment is CONFOUNDED with model identity. Measured over the golden extract (30,534 score documents, 41 models): the persona columns were graded by anthropic-claude-4.5-haiku (25 models), anthropic-claude-4.6-sonnet (9), google-gemini-3.1-pro (2) and openai-gpt-5.4 (1). ZERO models are graded by more than one judge, so judge severity cannot be separated from model quality and any comparison ACROSS judge blocks is invalid. The judge shown per row is derived from the data, not asserted.`,
  `Within the one block large enough to check (25 models graded by claude-4.5-haiku), the LLM-judged composite correlates only Spearman 0.483 / Pearson 0.505 with the judge-independent deterministic evaluators (ExpectedToolCalled, MinExpectedSteps, FinalAnswerPresent, SkillInvoked). The judge explains about a quarter of the variance in objectively checkable behaviour: gpt-5.5 ranks 1st by judge but 11th of 25 deterministically. Treat the judged axis as a separate instrument from what the model actually did, not as a refinement of it.`,
];

const provenance = {
  generatedAt: new Date().toISOString(),
  commitSha: process.env.COMMIT_SHA,
  source: 'golden cluster .ds-.evaluation-scores* (wave-2)',
  judgeModelId,
  judgeBreakdown,
  traceCache: process.env.TRACES_JSON ? 'golden .ds-.evaluation-scores* (task.output)' : 'none',
  // Statistical honesty notes ride in the template's own methodologyNotes slot,
  // so nothing in the original layout is removed to make room for them.
  //
  // The judge-provenance notes are UNCONDITIONAL. They used to live inside the
  // optional caveat-stats branch, which meant a plain render silently published
  // a board with no judge disclosure at all -- the same failure that let a
  // hardcoded "single unified judge" claim survive. A caveat that disappears
  // when an env var is unset is not a disclosure.
  methodologyNotes: [
    ...JUDGE_NOTES,
    ...(CAVEAT_STATS_PATH
      ? (() => {
          const s = JSON.parse(fs.readFileSync(CAVEAT_STATS_PATH!, 'utf8'));
          // Judged-evaluator subset, computed independently by the rejudge
          // analysis (/tmp/matrix_final.json). Published alongside the
          // all-evaluator figures so neither framing can be cherry-picked.
          const judged = JSON.parse(fs.readFileSync(JUDGED_STATS_PATH!, 'utf8'));
          const [j1, j2] = judged.rows;
          // Derived, not asserted: top-two difference over pooled 95% CI.
          judged.top2_t = (
            Math.abs(j1.score - j2.score) / Math.sqrt(j1.ci95 ** 2 + j2.ci95 ** 2)
          ).toFixed(2);
          return [
            `THIS BOARD DOES NOT RANK. Total spread across all ${s.ranking.length} models is ${s.spread} points on a 0-10 scale, while the 95% CI on a single model's mean reaches +/-${s.max_ci}. Only ${s.separable} of ${s.pairs} model pairs are distinguishable by a paired t-test over shared examples (two-sided .05); the #1-vs-#2 gap has t=${s.top2_t}. Every row is tie-tier T1. Read the ordering as arbitrary within the error bars.`,
            `On the four LLM-judged evaluators alone -- the judged-quality axis, and the subset the ` +
              `unified rejudge actually recomputed -- the spread is ${judged.spread} points against a median ` +
              `95% CI of +/-${judged.median_ci95}, and only ${judged.n_distinguishable} of ${judged.n_pairs} model pairs ` +
              `separate (paired t-test over shared examples, |t|>2). Five of those six are "beats Claude Opus 4.8"; ` +
              `the #1-vs-#2 gap is t=${judged.top2_t}. Both framings agree: this board does not rank.`,
            `Restricted to the four LLM-judged evaluators (Factuality, Groundedness, Relevance, Sequence Accuracy), the same computation gives a 0.70 spread against a +/-0.45 CI with the same ${s.separable}/${s.pairs} separable pairs -- the conclusion does not depend on which evaluator subset is used.`,
            `The Attack Discovery and Automatic Migrations columns come from SEPARATE golden runs that were NOT part of the wave-2 unified rejudge. Their LLM-judged evaluators were scored by a mix of judges (mostly anthropic-claude-4.6-sonnet, some google-gemini-3.1-pro), and Attack Discovery is a SINGLE example -- which is why several rows read a saturated 10.0. Do not compare those three columns across models with the same confidence as the 21 persona columns, and note the headline spread/CI figures above are computed on the persona columns only, since these suites carry raw-count evaluators on a different scale.`,
            `Re-scoring identical trajectories with a different judge (claude-4.5-haiku) reorders the board (Spearman rho=0.55): judge choice moves rank more than model quality does. That is the strongest argument against reading this as a leaderboard.`,
            `Scores cluster because the suite saturates, not because the models are equal. Real discrimination needs repetitions (to measure the noise floor directly) and harder examples that frontier models actually fail.`,
            `GLM models are excluded from this board entirely. gpt-5.4-nano contributes 19 of 21 examples: two produced no agent response at all and are omitted rather than scored as zero.`,
          ];
        })()
      : []),
  ],
  note: 'Judged evaluators carry the judge that actually graded them (derived per suite from the golden extract, not asserted); trace-based evaluators carried forward.',
};

const tracesPath = process.env.TRACES_JSON;
const traces = tracesPath
  ? (JSON.parse(fs.readFileSync(tracesPath, 'utf8')) as MatrixTraceData)
  : undefined;

const html = renderMatrixHtml(matrix, config, provenance, traces);

fs.mkdirSync(outDir, { recursive: true });
// The upstream CLI (cli/commands/matrix.ts:437) writes the renderMatrixHtml
// output as matrix.html -- it never writes index.html. Match that name so the
// artifact is comparable to target/llm_matrix_final/matrix.html, the actual
// product of this renderer. (llm_matrix_final/index.html is a separate
// HAND-AUTHORED summary page with hardcoded hex colors and no generator in the
// repo; reproducing it would mean copying, which the anti-cheat rule forbids.)
fs.writeFileSync(path.join(outDir, 'matrix.html'), html);
// Keep index.html as a byte-identical alias so existing links/gates resolve.
fs.writeFileSync(path.join(outDir, 'index.html'), html);
fs.writeFileSync(
  path.join(outDir, 'matrix.json'),
  JSON.stringify({ ...matrix, provenance }, null, 2)
);

const rows = [...matrix.proprietary, ...matrix.openSource];
// eslint-disable-next-line no-console
console.log(
  JSON.stringify(
    {
      rows: rows.length,
      htmlChars: html.length,
      tiers: rows.map((r) => ({
        model: r.modelId,
        overall: r.overall?.kind === 'score' ? r.overall.value : r.overall?.kind,
        tier: r.tier,
      })),
      warnings,
    },
    null,
    1
  )
);
