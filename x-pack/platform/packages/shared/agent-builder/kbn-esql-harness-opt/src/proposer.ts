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

const PROPOSER_TASK = (incumbentConfigName: string) => `You are optimizing the configuration of the
Kibana \`generate_esql\` harness. In this directory you will find:

- \`bundle.json\` — failing examples from the latest run against the search split: the question,
  the query the harness produced, the gold query, the Elasticsearch error the model was shown,
  how many generation attempts it took, and token spend.
- \`${incumbentConfigName}\` — the configuration that produced those results.
- \`history.json\` — previously proposed configs with their gate outcomes (may be empty).

Your job is to propose ONE new configuration that scores better on the composite reward
\`0.6·result_equivalence + 0.3·executes + 0.1·ast_valid\` without increasing token cost by more
than 10%.

The only thing you may change is this typed config object:

${SLOT_SCHEMA}

Rules, which are enforced mechanically after you answer:
1. Change at most TWO top-level slots. A diffuse edit cannot be attributed to anything.
2. Never mention a concrete index name, field name, or query from the bundle in the config —
   the config must generalize to unseen data. Candidates that do are rejected automatically.
3. Prefer feedback (slot D) and exemplar (slot B) edits over prompt prose (slot G); prose edits
   regress more often than they help in published ablations.
3b. The model slot (F) is the strongest cost lever in both directions: a higher tier for the
   generation step buys quality at a token price, a lower tier for keyword selection buys
   savings. A candidate can also win by holding quality while spending less.
4. Base the change on evidence in \`bundle.json\`: name the failures you expect it to fix.

Write your answer to a file called \`proposal.json\` in this directory, with exactly this shape:

{
  "config": { ...the full EsqlHarnessConfig object... },
  "manifest": {
    "slots": ["feedback"],
    "rationale": "one paragraph",
    "predictedFixes": ["first few words of each question you expect to flip to correct"],
    "predictedRegressions": ["questions you expect might regress"]
  }
}

Do not modify any other file. Do not run the evaluation yourself.`;

/** Run the proposer agent in a scratch directory that holds the bundle and nothing else. */
export const proposeCandidate = async ({
  summary,
  incumbentConfig,
  history,
  scratchDir,
  log,
  model = process.env.HARNESS_PROPOSER_MODEL ?? 'grok-4.7-low',
  timeoutMs = Number(process.env.HARNESS_PROPOSER_TIMEOUT_MS ?? 900_000),
}: {
  summary: RunSummary;
  incumbentConfig: Record<string, unknown>;
  history: unknown[];
  scratchDir: string;
  log: ToolingLog;
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
      args: [scratchDir, '--model', model, PROPOSER_TASK('incumbent.json')],
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
