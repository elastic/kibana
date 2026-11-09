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

const PROPOSER_TASK = ({
  modelChoices,
}: {
  modelChoices: Array<{ connectorId: string; inferenceId: string }>;
}) => `You are optimizing the Kibana \`generate_esql\` harness: the prompts, documentation corpus,
control flow and model choice behind the tool that turns a natural-language question into an
ES|QL query. You improve it by editing its files in this checkout.

In \`.harness-scratch/\` you will find:

- \`bundle.json\` — failing examples from the latest run on the search split: the question, the
  query the harness produced, the gold query, the Elasticsearch error shown to the model, the
  number of attempts and the token spend.
- \`history.json\` — every earlier proposal, with its gate outcome and rejection reason.
- \`feedback.md\` — measured facts about this harness and how your last prediction held up.

Your goal is a variant that scores better on \`0.6·result_equivalence + 0.3·executes +
0.1·ast_valid\` on held-out examples, without costing more than 1.1× in USD. A variant that holds
quality while costing materially less is equally welcome.

## What you may edit

All paths below are relative to
\`x-pack/platform/packages/shared/agent-builder/agent-builder-genai-utils/tools/generate_esql/\`:

- \`documentation/syntax.md\`, \`documentation/examples.md\`, \`documentation/ts_queries.md\`,
  \`documentation/promql_queries.md\` — the corpus injected into every prompt. Rewriting, pruning
  or re-ordering it is fair game, and it is the biggest block of tokens in the prompt.
- \`prompts/instructions.md\` — the instruction block, as prose.
- \`prompts.ts\` — how prompts are assembled (what is included, in what order).
- \`actions.ts\` — how previous attempts are replayed to the model.
- \`graph.ts\` — the control flow: nodes, retry branches, when generation stops. You may add a node.
- \`nl_to_esql.ts\` — entry point: defaults, index discovery, which model tier is selected.
- \`join_errors.ts\`, \`promql_keyword.ts\` — deterministic middleware.

${
  modelChoices.length
    ? `If you change which model the tool uses, these connector ids exist:\n${modelChoices
        .map((choice) => `- ${choice.connectorId} → ${choice.inferenceId}`)
        .join('\n')}\n`
    : ''
}
Nothing else may change. The dataset, fixtures, scorers and the evaluation runner are off limits,
and edits outside the list are rejected mechanically before anything is measured.

## Check your own work before you finish

You have a shell. Use it — a round that fails these wastes 15 minutes of measurement:

\`\`\`
node scripts/type_check --project x-pack/platform/packages/shared/agent-builder/agent-builder-genai-utils/tsconfig.json
node scripts/jest x-pack/platform/packages/shared/agent-builder/agent-builder-genai-utils/tools/generate_esql
node scripts/eslint x-pack/platform/packages/shared/agent-builder/agent-builder-genai-utils/tools/generate_esql
\`\`\`

You can also read the tool's unit tests to understand expected behaviour — but you may not
change them, and you may not change the harness trace writer. Both are how your work is scored.

## Rules

1. Your edit must typecheck, pass the tool's unit tests and pass eslint; all three are re-run
   before measurement.
2. Keep the change coherent: one idea, however many files it naturally touches. The manifest has
   to name the failures you expect it to fix, and a scattered edit cannot be attributed to
   anything when the gate comes back.
3. A reviewer agent reads your diff before it is measured and blocks changes that encode the
   benchmark, detect the evaluation, tamper with measurement, escape the tool, or fake success.
   Write the change you would defend in review: something that helps any user of this tool, not
   something that helps on these examples.
4. Read \`feedback.md\` first, and do not repeat something \`history.json\` shows was rejected
   unless you change it materially and say what is different.

## Your answer

Edit the files, then write \`.harness-scratch/proposal.json\`:

{
  "manifest": {
    "slots": ["documentation/examples.md"],     // the files you touched
    "rationale": "one paragraph: what in bundle.json made you do this",
    "predictedFixes": ["first words of each question you expect to flip to correct"],
    "predictedRegressions": ["questions you expect might regress"]
  }
}

Do not run the evaluation yourself and do not commit anything.`;

/** Run the proposer agent in a scratch directory that holds the bundle and nothing else. */
export const proposeCandidate = async ({
  summary,
  history,
  feedback,
  scratchDir,
  workingDir,
  log,
  modelChoices = [],
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
  modelChoices?: Array<{ connectorId: string; inferenceId: string }>;
  model?: string;
  timeoutMs?: number;
}): Promise<Proposal> => {
  Fs.mkdirSync(scratchDir, { recursive: true });
  Fs.writeFileSync(Path.join(scratchDir, 'bundle.json'), buildTraceBundle(summary));
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
      args: [workingDir ?? scratchDir, '--model', model, PROPOSER_TASK({ modelChoices })],
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
