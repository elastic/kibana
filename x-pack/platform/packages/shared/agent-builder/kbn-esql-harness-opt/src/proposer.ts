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
  manifest: ProposalManifest;
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

const PROPOSER_TASK = () => `You are improving the Kibana \`generate_esql\` tool: the thing that
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
- \`history.json\` — every previous proposal, what it changed, and why it was accepted or not.
- \`feedback.md\` — measured facts about the tool, and how your last attempt turned out.

Read \`feedback.md\` and \`bundle.json\` first. Look at several failures and find the pattern
that explains the most of them. One well-aimed change beats three speculative ones.

## The code you may change

All paths relative to
\`x-pack/platform/packages/shared/agent-builder/agent-builder-genai-utils/tools/generate_esql/\`:

| file | what it decides | typical change |
|---|---|---|
| \`prompts/instructions.md\` | the rules the model is given | add, sharpen or remove a rule |
| \`documentation/examples.md\` | the worked examples injected into every prompt | add an example of a shape that keeps failing; drop ones that mislead |
| \`documentation/syntax.md\`, \`ts_queries.md\`, \`promql_queries.md\` | reference material | correct or prune it; it is the biggest block of tokens in the prompt |
| \`prompts.ts\` | what goes into each prompt, in what order, and when | include the TS/PROMQL sections differently, restructure the context |
| \`actions.ts\` | how a failed attempt is replayed to the model | change what the model is told after an error |
| \`graph.ts\` | control flow: generate → autocorrect → execute/validate → finalize | change a branch, add a node (e.g. a check before returning) |
| \`nl_to_esql.ts\` | entry point: defaults, index discovery, model selection | change a default, change how the target index is resolved |
| \`join_errors.ts\`, \`promql_keyword.ts\` | deterministic middleware | sharpen a heuristic |

Read the file before you change it, and keep the style of the code around you.

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
    "predictedFixes": ["first words of each question you expect to flip to correct"],
    "predictedRegressions": ["questions you expect might regress, if any"]
  }
}

Be honest in \`predictedFixes\`: it is checked against what actually changed, and a proposal that
cannot predict its own effect is treated as guesswork next round.`;

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
  model = process.env.HARNESS_PROPOSER_MODEL ?? 'grok-4.7-low',
  timeoutMs = Number(process.env.HARNESS_PROPOSER_TIMEOUT_MS ?? 900_000),
}: {
  summary: RunSummary;
  history: unknown[];
  /** Measured facts + last round's manifest verification, written to `feedback.md`. */
  feedback: string;
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
  Fs.writeFileSync(Path.join(scratchDir, 'history.json'), JSON.stringify(history, null, 2));
  Fs.writeFileSync(Path.join(scratchDir, 'feedback.md'), feedback);
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
      args: [workingDir ?? scratchDir, '--model', model, PROPOSER_TASK()],
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
