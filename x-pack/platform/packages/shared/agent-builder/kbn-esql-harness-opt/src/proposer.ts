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
  manifest: ProposalManifest & {
    /** Optional model alias the candidate should be measured on. */
    model?: string;
  };
}

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
      // Stable handle for predictions: prose labels never matched reliably, so a manifest
      // refers to examples by id and verification becomes exact.
      id: run.exampleId,
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
      // Nearly every failure here executes fine and returns the wrong data, so the rows are the
      // evidence: without them a proposer can only guess why a query was wrong from its text.
      rowsReturned: run.score.rowCount,
      goldRows: run.score.goldRowCount,
      columnsAligned: run.score.columnsAligned,
      extraColumns: run.score.extraColumns,
      sampleRows: run.score.sample,
      // Intermediate attempts show what the model tried before it settled, which is where a
      // retry- or feedback-shaped fix would have to bite.
      attemptedQueries: run.attemptedQueries?.slice(0, 4),
      attemptErrors: run.attemptErrors?.map((error) => error.slice(0, 400)),
      tries: run.tries,
      tokens: (run.inputTokens ?? 0) + (run.outputTokens ?? 0),
      // Relative path to the full graph trace for this call, copied next to the bundle.
      trace: run.fullTracePath ? `traces/${Path.basename(run.fullTracePath)}` : undefined,
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

/** One-line role for the files whose purpose is not obvious from the name. */
const FILE_ROLES: Record<string, string> = {
  'prompts/instructions.md': 'the rules the model is given, as prose',
  'prompts/instructions_template.ts': 'renders instructions.md (placeholders, limit, named params)',
  'documentation/examples.md': 'worked examples injected into every prompt',
  'documentation/syntax.md': 'ES|QL reference injected into every prompt',
  'documentation/ts_queries.md': 'time-series reference, injected when the index is a TSDS',
  'documentation/promql_queries.md': 'PROMQL reference, injected when PROMQL is requested',
  'documentation/load_doc.ts': 'loads and caches the documentation corpus',
  'prompts.ts': 'assembles each prompt: what is included, in what order, and when',
  'actions.ts': 'how previous attempts are replayed to the model after a failure',
  'graph.ts': 'control flow: generate → autocorrect → execute/validate → finalize, and retries',
  'nl_to_esql.ts': 'entry point: defaults, index discovery, model selection',
  'join_errors.ts': 'deterministic heuristic: rejected LOOKUP JOIN targets',
  'promql_keyword.ts': 'deterministic heuristic: when PROMQL docs are requested',
  'esql_completion.ts': 'the separate completion entry point',
  'cache_key.ts': 'prompt-cache key derivation',
};

/**
 * List the editable files from the checkout rather than from a hand-written table.
 *
 * A fixed table drifts: it listed files that had been removed and missed ones that were added,
 * and its ordering quietly advertised prose first, which is the surface every round already
 * over-uses. Reading the directory keeps the advertisement true, shows how large each file is,
 * and lets rounds that have never touched a file be called out.
 */
const describeEditableFiles = (toolDir: string, history: unknown[]): string => {
  const touched = new Set(
    (history as Array<{ filesChanged?: string[] }>)
      .flatMap((entry) => entry.filesChanged ?? [])
      .map((file) => file.split('generate_esql/').pop() ?? file)
  );

  const walk = (dir: string, prefix = ''): string[] =>
    Fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.name.startsWith('.')) return [];
      if (entry.isDirectory()) return walk(Path.join(dir, entry.name), relative);
      if (/\.test\.ts$/.test(entry.name) || entry.name === 'harness_trace.ts') return [];
      return [relative];
    });

  const rows = walk(toolDir)
    .map((relative) => {
      const lines = Fs.readFileSync(Path.join(toolDir, relative), 'utf8').split('\n').length;
      return { relative, lines, role: FILE_ROLES[relative] ?? '' };
    })
    .sort((a, b) => b.lines - a.lines);

  return rows
    .map(
      ({ relative, lines, role }) =>
        `- \`${relative}\` (${lines} lines)${role ? ` — ${role}` : ''}${
          touched.has(relative) ? '' : '  [never edited in any round so far]'
        }`
    )
    .join('\n');
};

const PROPOSER_TASK = ({
  models,
  editableFiles,
}: {
  models: Array<{ alias: string; inputPrice: number; outputPrice: number }>;
  editableFiles: string;
}) => `You are improving the Kibana \`generate_esql\` tool: the thing that
turns a natural-language question into an ES|QL query. You improve it by editing its source in
this checkout, the way a Kibana engineer would. It is then measured on held-out examples.

## Start here

\`.harness-scratch/\` contains:

- \`bundle.json\` — failures from the latest measurement. For each one: the question, the query
  the tool produced and every earlier attempt, the gold query, the Elasticsearch error the model
  saw, and — most importantly — \`sampleRows\`, the first rows each query actually returned
  alongside the rows the gold query returned. Compare them. Almost every failure here executes
  without error and returns the wrong data, so the rows tell you what went wrong; the query text
  alone usually does not.
- \`traces/\` — the complete LangGraph trace of every call in this run, one JSON file per call:
  the exact prompt messages sent to the model (system, user, and the replayed history of earlier
  attempts), the model's raw replies, the resolved index with its sampled fields and values, the
  documentation keywords it asked for and the docs it got back, every autocorrect, execution and
  validation step with its error, and the final state. Each failure in \`bundle.json\` names its
  trace file. Read a few in full before deciding what to change — this is the only place where
  you can see what the model was actually told.
- \`history.json\` — one line per previous proposal: files changed, rationale, verdict, why,
  reward delta, cost ratio. Skim this first.
- \`history_full.json\` — the same rounds in full: the complete diff of each attempt, the
  per-example deltas it produced on both splits, the gate statistics and the manifest check.
  Open it when a previous round looks relevant to what you are about to try — particularly
  before repeating a surface that has already been measured.
- \`feedback.md\` — measured facts about the tool, and how your last attempt turned out.

Read \`feedback.md\` and \`bundle.json\` first. Look at several failures and find the pattern
that explains the most of them. One well-aimed change beats three speculative ones.

## The code you may change

Everything under
\`x-pack/platform/packages/shared/agent-builder/agent-builder-genai-utils/tools/generate_esql/\`,
except the unit tests and \`harness_trace.ts\` — those are how your work is measured, and edits
to them are rejected. The files, largest first:

${editableFiles}

Read a file before you change it, and keep the style of the code around it. A file nobody has
touched is not necessarily the wrong answer — it is often just harder to think about than
editing prose.

## How to make specific kinds of change correctly

- **Change the model.** Use the effort level, which every deployment resolves for itself:
  \`modelProvider.selectModel({ effortLevel: EffortLevels.medium })\`. Never write a connector
  id into the code — those are UUIDs that exist only in one deployment, so that change would
  break every other installation and will be rejected.
- **Change retry or execution behaviour.** Edit the defaults in \`nl_to_esql.ts\` or the branch
  conditions in \`graph.ts\`. Do not special-case anything about the data being queried.
- **Add guidance.** Put rules in \`prompts/instructions.md\` and worked examples in
  \`documentation/examples.md\`. Write them for a user you will never meet, with placeholder
  index and field names, never the ones in \`bundle.json\`.
- **Add a processing step.** Add it to \`graph.ts\` as a node, or to the middleware files, with
  the same error handling as the code around it.

## Choosing a different model

Two different things, and only one of them belongs in the code:

- **The tier** is code. \`nl_to_esql.ts\` selects with
  \`modelProvider.selectModel({ effortLevel: EffortLevels.low })\`, and raising it to \`medium\`
  or \`high\` is a legitimate edit every deployment can honour. Never write a connector id:
  those are UUIDs that exist on one machine only.
- **A specific model** is not code, because a model that exists here may not exist elsewhere.
  If you want one measured, name it in your manifest instead:

  \`"model": "<alias>"\` — the candidate is then run on that model and priced accordingly.

${
  models.length
    ? `Available aliases, with list price per million tokens (input / output):\n${models
        .map((entry) => `- ${entry.alias} — $${entry.inputPrice} / $${entry.outputPrice}`)
        .join('\n')}\n\nThe reward is not cost-adjusted, but the gate rejects a candidate that` +
      ' costs more than 1.1x the incumbent unless it is also materially better, so an expensive' +
      ' model has to earn its price.\n'
    : ''
}
## Verify before you finish

You have a shell. Run these from the repo root; a round that fails them is wasted:

\`\`\`
node scripts/type_check --project x-pack/platform/packages/shared/agent-builder/agent-builder-genai-utils/tsconfig.json
node scripts/jest x-pack/platform/packages/shared/agent-builder/agent-builder-genai-utils/tools/generate_esql
node scripts/eslint x-pack/platform/packages/shared/agent-builder/agent-builder-genai-utils/tools/generate_esql
\`\`\`

The tool's unit tests describe its expected behaviour — read them. You may not change them, and
you may not change \`harness_trace.ts\`; both are how your work is measured.

## What gets your change thrown out

A reviewer reads your diff before it is measured and blocks anything that improves the score
without improving the tool: values from the benchmark written into the code, behaviour that
depends on detecting the evaluation, edits to the measurement, filesystem or network access the
tool did not already have, or shortcuts that make a failure look like a success.

The test is simple: would you defend this change in a Kibana code review to someone who has
never seen the benchmark?

## Finish

Write \`.harness-scratch/proposal.json\`:

{
  "manifest": {
    "slots": ["documentation/examples.md"],
    "rationale": "what in bundle.json made you do this, in a paragraph",
    "predictedFixes": ["<id from bundle.json>", "<id>"],
    "predictedRegressions": ["<id>", "..."]
  }
}

\`predictedFixes\` and \`predictedRegressions\` must contain **\`id\` values copied from
\`bundle.json\`**, not prose. They are matched exactly against what changed when the candidate is
re-measured on the same examples, so a wrong id reads as a failed prediction.

Be honest and specific: predicting ten ids to cover yourself scores worse than predicting the
three you actually reasoned about. A proposal that cannot predict its own effect is treated as
guesswork in the next round.`;

/** Run the proposer agent in a scratch directory that holds the bundle and nothing else. */
/**
 * Copy the full graph traces of the bundled failures next to the bundle.
 *
 * One file per call, containing the prompts that were sent, the model's replies, the resource
 * context, the documentation it requested and every action in order. The bundle summarises; this
 * is the raw material behind it, for when the summary is not enough.
 */
const copyTraces = (summary: RunSummary, scratchDir: string): number => {
  const traceDir = Path.join(scratchDir, 'traces');
  Fs.rmSync(traceDir, { recursive: true, force: true });
  Fs.mkdirSync(traceDir, { recursive: true });

  let copied = 0;
  for (const run of summary.runs) {
    if (!run.fullTracePath || !Fs.existsSync(run.fullTracePath)) continue;
    Fs.copyFileSync(run.fullTracePath, Path.join(traceDir, Path.basename(run.fullTracePath)));
    copied++;
  }
  return copied;
};

export const proposeCandidate = async ({
  summary,
  history,
  feedback,
  scratchDir,
  workingDir,
  log,
  models = [],
  // No default: the wrapper's own CLI default is used unless one is named, and claiming a model
  // the wrapper then ignores is worse than claiming none.
  model = process.env.HARNESS_PROPOSER_MODEL ?? '',
  timeoutMs = Number(process.env.HARNESS_PROPOSER_TIMEOUT_MS ?? 900_000),
}: {
  summary: RunSummary;
  history: unknown[];
  /** Measured facts + last round's manifest verification, written to `feedback.md`. */
  feedback: string;
  /** Models the candidate may be measured on, with their prices. */
  models?: Array<{ alias: string; inputPrice: number; outputPrice: number }>;
  scratchDir: string;
  /** Directory the agent runs in: the candidate worktree. */
  workingDir: string;
  log: ToolingLog;
  model?: string;
  timeoutMs?: number;
}): Promise<Proposal> => {
  Fs.mkdirSync(scratchDir, { recursive: true });
  Fs.writeFileSync(Path.join(scratchDir, 'bundle.json'), buildTraceBundle(summary));
  const traceCount = copyTraces(summary, scratchDir);
  log.info(`[harness-opt] bundle written with ${traceCount} full graph trace(s)`);
  // History is for learning from, so it carries the verdict and the reason — not the per-seed
  // tables and full diffs, which buried the one line that matters under tens of KB.
  const digest = (history as Array<Record<string, unknown>>).map((entry) => {
    const gate = (entry.gate ?? {}) as Record<string, unknown>;
    return {
      round: entry.round,
      filesChanged: ((entry.filesChanged as string[]) ?? []).map((file) =>
        file.split('generate_esql/').pop()
      ),
      rationale: ((entry.manifest ?? {}) as { rationale?: string }).rationale,
      outcome: entry.rejected
        ? `rejected before measurement (${entry.rejected})`
        : gate.accepted
        ? 'ACCEPTED'
        : 'rejected at the gate',
      why: entry.rejected
        ? ((entry.failures as string[]) ?? []).join(' ').slice(0, 400)
        : ((gate.reasons as string[]) ?? []).join('; '),
      deltaReward: gate.meanDelta,
      costRatio: gate.costRatio,
    };
  });
  Fs.writeFileSync(Path.join(scratchDir, 'history.json'), JSON.stringify(digest, null, 2));
  // The digest is for skimming; everything is still here when a round is worth understanding
  // properly — full diffs, per-seed deltas on both splits, gate statistics, manifest checks.
  Fs.writeFileSync(Path.join(scratchDir, 'history_full.json'), JSON.stringify(history, null, 2));
  Fs.writeFileSync(Path.join(scratchDir, 'feedback.md'), feedback);
  const proposalPath = Path.join(scratchDir, 'proposal.json');
  if (Fs.existsSync(proposalPath)) {
    Fs.unlinkSync(proposalPath);
  }

  const command =
    process.env.HARNESS_PROPOSER_CMD ??
    Path.join(process.env.HOME ?? '', '.pi/agent/skills/cursor-subagent/cursor-task');

  const logPath = Path.join(scratchDir, 'proposer.log');
  log.info(
    `[harness-opt] proposing candidate with ${command} (${
      model || 'wrapper default'
    }); log: ${logPath}`
  );
  try {
    const code = await runProposerCommand({
      command,
      args: [
        workingDir ?? scratchDir,
        ...(model ? ['--model', model] : []),
        PROPOSER_TASK({
          models,
          editableFiles: describeEditableFiles(
            Path.join(
              workingDir ?? '',
              'x-pack/platform/packages/shared/agent-builder/agent-builder-genai-utils/tools/generate_esql'
            ),
            history
          ),
        }),
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
  if (!proposal.manifest) {
    throw new Error('[harness-opt] proposal.json is missing "manifest"');
  }
  return proposal;
};
