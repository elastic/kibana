/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawn } from 'child_process';
import Fs from 'fs';
import Path from 'path';
import type { ToolingLog } from '@kbn/tooling-log';
import type { RunSummary } from './runner';

/** Run the proposer, streaming its output to a log file so a stuck round is visible while it runs. */
const runProposerCommand = ({
  command,
  args,
  logPath,
  timeoutMs,
}: {
  command: string;
  args: string[];
  logPath: string;
  timeoutMs: number;
}): Promise<number> =>
  new Promise((resolve, reject) => {
    const logStream = Fs.createWriteStream(logPath, { flags: 'a' });
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.pipe(logStream);
    child.stderr.pipe(logStream);

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`proposer timed out after ${timeoutMs}ms (log: ${logPath})`));
    }, timeoutMs);

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve(code ?? 0);
    });
  });

export interface ProposalManifest {
  slots: string[];
  rationale: string;
  predictedFixes: string[];
  predictedRegressions: string[];
}

export interface Proposal {
  config: Record<string, unknown>;
  /** Replacement content for text assets, keyed by asset path. */
  assets?: Record<string, string>;
  manifest: ProposalManifest;
}

const SLOT_SCHEMA = `interface EsqlHarnessConfig {
  docRetrieval: { prefetchWithoutResource: boolean; alwaysInclude: string[] };            // slot A
  exemplars: { selection: 'all' | 'knn'; k: number };                                      // slot B
  resourceContext: { samplingSize: number };                                               // slot C
  feedback: {                                                                              // slot D
    errorTruncation: number;              // 0 = unlimited
    includeFailedQuery: boolean;          // makes {{query}} available in templates
    executionErrorTemplate: string;       // placeholders: {{error}}, {{query}}
    validationErrorTemplate: string;
    noQueryTemplate: string;
  };
  retryPolicy: {                                                                           // slot E
    maxRetries: number | null;            // null = caller's value (3)
    execute: 'none' | 'schema' | 'data' | null;
    executionTimeoutMs: number | null;
    stopOnJoinReject: boolean;
    timeoutRetryBudget: number;
  };
  model: {                                                                                 // slot F
    generateEffort: 'low' | 'medium' | 'high';     // tier used to write the query
    requestDocEffort: 'low' | 'medium' | 'high';   // tier used to pick documentation keywords
  };
  instructions: { extraInstructions: string };                                             // slot G
}`;

/**
 * Per-example failure evidence handed to the proposer.
 *
 * Only failing or partially-failing runs are included, with the error the model actually saw —
 * the point of the bundle is attributable evidence, not a score dump.
 */
export const buildTraceBundle = (summary: RunSummary): string => {
  const failures = summary.runs
    .filter((run) => run.score.reward < 0.95)
    .sort((a, b) => a.score.reward - b.score.reward)
    .slice(0, 25)
    .map((run) => ({
      question: run.question,
      target: run.resolvedTarget ?? run.index,
      requestedKeywords: run.requestedKeywords,
      generatedQuery: run.generatedQuery,
      goldQuery: run.goldQuery,
      goldExecutable: run.goldExecutable,
      astValid: run.score.astValid,
      executes: run.score.executes,
      resultEquivalence: run.score.resultEquivalence,
      executionError: run.score.error?.slice(0, 600),
      attemptErrors: run.attemptErrors?.map((error) => error.slice(0, 400)),
      tries: run.tries,
      tokens: (run.inputTokens ?? 0) + (run.outputTokens ?? 0),
    }));

  return JSON.stringify(
    {
      label: summary.label,
      meanReward: summary.meanReward,
      meanExecutes: summary.meanExecutes,
      meanResultEquivalence: summary.meanResultEquivalence,
      meanTries: summary.meanTries,
      totalTokens: summary.totalInputTokens + summary.totalOutputTokens,
      failures,
    },
    null,
    2
  );
};

const FORBIDDEN_PATTERNS = [
  /postgres-logs/i,
  /packetbeat/i,
  /nyc_taxis/i,
  /metricbeat/i,
  /employees-/i,
  /logs-production/i,
  /error_rate_daily/i,
  /traces-apm/i,
  /metrics-apm/i,
];

/**
 * Reject a candidate that smuggles the benchmark into the harness.
 *
 * Hardcoded fixture index names are the shortcut audits of this literature found in every
 * framework they examined, and they are invisible in the score until the sealed split.
 */
export const lintProposal = (config: Record<string, unknown>): string[] => {
  const serialized = JSON.stringify(config);
  const violations = FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(serialized)).map(
    (pattern) => `config references benchmark data (${pattern})`
  );
  if (serialized.length > 20_000) {
    violations.push('config is implausibly large (>20k chars)');
  }
  return violations;
};

const EDITABLE_FILES_TEXT = `You may also edit these files directly in this checkout:

- tools/generate_esql/documentation/{syntax,examples,ts_queries,promql_queries}.md — the ES|QL
  documentation corpus injected into every prompt. Rewriting, pruning or re-ordering it is fair
  game; it is also the biggest block of tokens in the prompt, so pruning is a cost lever.
- tools/generate_esql/prompts/instructions.md — the instruction block, as plain text.
- tools/generate_esql/prompts.ts — how prompts are assembled.
- tools/generate_esql/actions.ts — how past attempts are replayed to the model.
- tools/generate_esql/graph.ts — the control flow (nodes, retry branches). You may add a node.
- tools/generate_esql/exemplars.ts, join_errors.ts, promql_keyword.ts — deterministic middleware.

(Paths are relative to x-pack/platform/packages/shared/agent-builder/agent-builder-genai-utils/.)

Anything you change there must typecheck, pass the tool's existing unit tests and pass eslint —
all three run automatically before your variant is measured, and a failure wastes the round. Do
not touch any other file: the dataset, fixtures, scorers and the evaluation runner are off limits
and edits outside the list are rejected mechanically.`;

const PROPOSER_TASK = ({
  modelChoices,
  editableFiles,
}: {
  modelChoices: Array<{ connectorId: string; inferenceId: string }>;
  editableFiles: boolean;
}) => `You are optimizing the Kibana \`generate_esql\` harness: the prompts, documentation corpus,
control flow and model choice behind the tool that turns a natural-language question into an
ES|QL query.

In \`.harness-scratch/\` you will find:

- \`bundle.json\` — failing examples from the latest run on the search split: the question, the
  query the harness produced, the gold query, the Elasticsearch error shown to the model, the
  number of attempts and the token spend.
- \`incumbent.json\` — the typed configuration that produced those results.
- \`assets.json\` — text assets currently overriding the bundled ones (often empty).
- \`history.json\` — every earlier proposal, with its gate outcome and rejection reason.
- \`feedback.md\` — measured facts about this harness and how your last prediction held up.

Your goal is a variant that scores better on \`0.6·result_equivalence + 0.3·executes +
0.1·ast_valid\`, measured on held-out examples, without costing more than 1.1× in USD. A variant
that holds quality while costing materially less is equally welcome.

## Channel 1 — the typed config

${SLOT_SCHEMA}

${
  modelChoices.length
    ? `Connector ids available for the model slot:\n${modelChoices
        .map((choice) => `- ${choice.connectorId} → ${choice.inferenceId}`)
        .join('\n')}\nUse \`null\` to keep the context's own model selection.\n`
    : ''
}
## Channel 2 — text assets

Write replacement content for \`documentation/*.md\` or \`prompts/instructions.md\` into the
\`assets\` field of your proposal (keyed by that exact relative path). These are swapped at
runtime without touching code.

${editableFiles ? `## Channel 3 — code\n\n${EDITABLE_FILES_TEXT}\n` : ''}
## Rules, enforced mechanically

1. Change at most TWO areas. A diffuse edit cannot be attributed to anything.
2. Never mention a concrete index name, field name or query from the bundle. The harness has to
   generalise to unseen data; candidates that leak the benchmark are rejected automatically.
3. Prefer evidence-driven edits: name the failures in \`bundle.json\` you expect to fix.
4. Read \`feedback.md\` first, and do not re-propose something \`history.json\` shows was already
   rejected unless you change it materially and say what is different.

## Your answer

Write \`.harness-scratch/proposal.json\`:

{
  "config": { ...the full typed config, including unchanged slots... },
  "assets": { "documentation/examples.md": "...new content..." },   // optional
  "manifest": {
    "slots": ["exemplars"],                    // or asset/file names you touched
    "rationale": "one paragraph",
    "predictedFixes": ["first words of each question you expect to flip to correct"],
    "predictedRegressions": ["questions you expect might regress"]
  }
}

Do not run the evaluation yourself and do not commit anything.`;

/** Run the proposer agent in a scratch directory that holds the bundle and nothing else. */
export const proposeCandidate = async ({
  summary,
  incumbentConfig,
  incumbentAssets = {},
  history,
  feedback,
  scratchDir,
  workingDir,
  editableFiles = false,
  log,
  modelChoices = [],
  model = process.env.HARNESS_PROPOSER_MODEL ?? 'grok-4.7-low',
  timeoutMs = Number(process.env.HARNESS_PROPOSER_TIMEOUT_MS ?? 900_000),
}: {
  summary: RunSummary;
  incumbentConfig: Record<string, unknown>;
  incumbentAssets?: Record<string, string>;
  history: unknown[];
  /** Measured facts + last round's manifest verification, written to `feedback.md`. */
  feedback: string;
  scratchDir: string;
  /** Directory the agent runs in; the candidate worktree when code edits are allowed. */
  workingDir?: string;
  editableFiles?: boolean;
  log: ToolingLog;
  modelChoices?: Array<{ connectorId: string; inferenceId: string }>;
  model?: string;
  timeoutMs?: number;
}): Promise<Proposal> => {
  Fs.mkdirSync(scratchDir, { recursive: true });
  Fs.writeFileSync(Path.join(scratchDir, 'bundle.json'), buildTraceBundle(summary));
  Fs.writeFileSync(
    Path.join(scratchDir, 'incumbent.json'),
    JSON.stringify(incumbentConfig, null, 2)
  );
  Fs.writeFileSync(Path.join(scratchDir, 'history.json'), JSON.stringify(history, null, 2));
  Fs.writeFileSync(Path.join(scratchDir, 'feedback.md'), feedback);
  Fs.writeFileSync(Path.join(scratchDir, 'assets.json'), JSON.stringify(incumbentAssets, null, 2));
  const proposalPath = Path.join(scratchDir, 'proposal.json');
  if (Fs.existsSync(proposalPath)) {
    Fs.unlinkSync(proposalPath);
  }

  const command =
    process.env.HARNESS_PROPOSER_CMD ??
    Path.join(process.env.HOME ?? '', '.pi/agent/skills/cursor-subagent/cursor-task');

  const logPath = Path.join(scratchDir, 'proposer.log');
  log.info(`[harness-opt] proposing candidate with ${command} (${model}); log: ${logPath}`);
  try {
    const code = await runProposerCommand({
      command,
      args: [
        workingDir ?? scratchDir,
        '--model',
        model,
        PROPOSER_TASK({ modelChoices, editableFiles }),
      ],
      logPath,
      timeoutMs,
    });
    if (code !== 0) {
      log.warning(`[harness-opt] proposer exited with code ${code}; see ${logPath}`);
    }
  } catch (e) {
    log.warning(`[harness-opt] proposer command failed: ${(e as Error).message}`);
  }

  if (!Fs.existsSync(proposalPath)) {
    throw new Error('[harness-opt] proposer did not write proposal.json');
  }

  const proposal = JSON.parse(Fs.readFileSync(proposalPath, 'utf8')) as Proposal;
  if (!proposal.config || !proposal.manifest) {
    throw new Error('[harness-opt] proposal.json is missing "config" or "manifest"');
  }
  return proposal;
};
