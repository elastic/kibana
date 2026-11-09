/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFile } from 'child_process';
import Fs from 'fs';
import Path from 'path';
import { promisify } from 'util';
import type { ToolingLog } from '@kbn/tooling-log';

const execFileAsync = promisify(execFile);

const TOOL_DIR =
  'x-pack/platform/packages/shared/agent-builder/agent-builder-genai-utils/tools/generate_esql';

/**
 * Files the optimizer may rewrite in full.
 *
 * Everything here is inside the `generate_esql` tool and nothing here can read the dataset, the
 * fixtures, the scorers or the gate. The list is deliberately explicit rather than a glob: the
 * review's clearest failure mode is an optimizer that edits its own evaluator.
 */
export const EDITABLE_PATH_PREFIXES: string[] = [`${TOOL_DIR}/`];

/**
 * Files inside the tool that stay fixed even though they live under an editable folder.
 *
 * The unit tests are a guard on the optimizer, not part of its search space, and the trace
 * writer is measurement apparatus — an optimizer that can edit either can make itself look good
 * without changing anything real.
 */
export const PROTECTED_PATHS: RegExp[] = [/\.test\.ts$/, /harness_trace\.ts$/];

/**
 * Patterns that must never appear in a generated edit.
 *
 * Two classes: benchmark leakage (fixture names, gold strings), and anything that would let the
 * edit reach outside the tool — new dependencies, process/network/filesystem access, or a bypass
 * of the model call that the harness is supposed to be improving.
 */
/**
 * Patterns that must never be *added* by an edit.
 *
 * Only concrete fixture identities count as leakage. Wildcards like `postgres-logs*` appear in
 * Elastic's own published ES|QL examples and in the bundled corpus, so flagging them rejected
 * every legitimate edit to the documentation; what matters is a variant that names the exact
 * indices this benchmark happens to use.
 */
const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /logs-production\.evaluations/i, reason: 'concrete fixture index' },
  { pattern: /production\.evaluations\.2025/i, reason: 'concrete fixture index' },
  { pattern: /kibana_sample_data_/i, reason: 'benchmark corpus index' },
  { pattern: /error_rate_daily|nyc_taxis/i, reason: 'benchmark corpus index' },
  {
    pattern: /child_process|require\(\s*['"]fs['"]|from\s+['"]fs['"]/i,
    reason: 'filesystem or process access',
  },
  { pattern: /\bfetch\(|axios/i, reason: 'network access' },
  { pattern: /process\.env(?!\.NODE_ENV)/i, reason: 'environment access' },
  { pattern: /eval\(|new Function\(/i, reason: 'dynamic code execution' },
  { pattern: /@kbn\/esql-harness-opt/i, reason: 'reaching into the optimization loop' },
];

export interface CodeEdit {
  path: string;
  content: string;
}

/**
 * Lint an edit against its own previous content.
 *
 * Counting occurrences rather than matching outright: `documentation/examples.md` legitimately
 * contains `FROM postgres-logs*` as a published ES|QL example, and a whole-file scan rejected
 * every edit to that file. What matters is whether the edit *introduces* more benchmark
 * leakage than was already there.
 */
export const lintCodeEdits = (
  edits: CodeEdit[],
  originalContent: (path: string) => string = () => ''
): string[] => {
  const violations: string[] = [];
  const count = (text: string, pattern: RegExp): number =>
    (text.match(new RegExp(pattern.source, `${pattern.flags.replace('g', '')}g`)) ?? []).length;

  for (const edit of edits) {
    const normalized = edit.path.replace(/^\.\//, '');
    if (!EDITABLE_PATH_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
      violations.push(`${edit.path} is outside the editable folders`);
      continue;
    }
    if (PROTECTED_PATHS.some((pattern) => pattern.test(normalized))) {
      violations.push(`${edit.path} is protected (tests and trace writer are fixed)`);
      continue;
    }
    const before = originalContent(normalized);
    for (const { pattern, reason } of FORBIDDEN_PATTERNS) {
      const added = count(edit.content, pattern) - count(before, pattern);
      if (added > 0) {
        violations.push(`${edit.path}: adds ${added} occurrence(s) of ${reason} (${pattern})`);
      }
    }
    if (edit.content.length > 120_000) {
      violations.push(`${edit.path}: implausibly large (${edit.content.length} chars)`);
    }
  }

  return violations;
};

export interface CandidateWorkspace {
  path: string;
  kibanaUrl: string;
}

const run = async (
  command: string,
  args: string[],
  cwd: string,
  timeoutMs = 1_800_000
): Promise<{ ok: boolean; output: string }> => {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd,
      timeout: timeoutMs,
      maxBuffer: 50 * 1024 * 1024,
      env: { ...process.env },
    });
    return { ok: true, output: `${stdout}\n${stderr}`.slice(-4000) };
  } catch (e) {
    const error = e as { stdout?: string; stderr?: string; message: string };
    return {
      ok: false,
      output: `${error.stdout ?? ''}\n${error.stderr ?? ''}\n${error.message}`.slice(-4000),
    };
  }
};

/**
 * Create the candidate worktree, bootstrap it, and point its Kibana at the shared cluster.
 *
 * A second checkout rather than a restart loop: incumbent and candidate have to be measurable in
 * the same round, and a dev-server restart per config swap would dominate the round's wall clock.
 */
export const setupCandidateWorktree = async ({
  mainWorktree,
  candidatePath,
  esUrl,
  port,
  log,
}: {
  mainWorktree: string;
  candidatePath: string;
  esUrl: string;
  port: number;
  log: ToolingLog;
}): Promise<void> => {
  if (!Fs.existsSync(candidatePath)) {
    log.info(`[candidate] creating worktree at ${candidatePath}`);
    const created = await run(
      'git',
      ['worktree', 'add', '--detach', candidatePath, 'HEAD'],
      mainWorktree
    );
    if (!created.ok) {
      throw new Error(`[candidate] worktree creation failed: ${created.output}`);
    }
  }

  Fs.mkdirSync(Path.join(candidatePath, 'config'), { recursive: true });
  Fs.writeFileSync(
    Path.join(candidatePath, 'config/kibana.dev.yml'),
    [
      '# Candidate lane for the generate_esql harness optimization loop.',
      `elasticsearch.hosts: ["${esUrl}"]`,
      `server.publicBaseUrl: http://localhost:${port}`,
      "xpack.encryptedSavedObjects.encryptionKey: 'harness-opt-candidate-encryption-key-0123456789'",
      'telemetry.enabled: false',
      '',
    ].join('\n')
  );

  log.info('[candidate] bootstrapping (this takes a few minutes)');
  const bootstrapped = await run('node', ['scripts/kbn', 'bootstrap'], candidatePath, 3_600_000);
  if (!bootstrapped.ok) {
    throw new Error(`[candidate] bootstrap failed: ${bootstrapped.output}`);
  }
  log.info('[candidate] ready — start it with `start-candidate`');
};

/** Discard every change in the candidate worktree, so a rejected round leaves no residue. */
export const resetCandidate = async (workspace: CandidateWorkspace): Promise<void> => {
  await run('git', ['checkout', '--', '.'], workspace.path);
  await run('git', ['clean', '-fd', TOOL_DIR], workspace.path);
};

/** Committed content of a file in the candidate worktree. */
export const gitShow = async (workspace: CandidateWorkspace, path: string): Promise<string> => {
  const { ok, output } = await run('git', ['show', `HEAD:${path}`], workspace.path);
  return ok ? output : '';
};

/** Files the proposer changed, as a diff against the worktree's clean state. */
export const collectEdits = async (workspace: CandidateWorkspace): Promise<CodeEdit[]> => {
  const { output } = await run('git', ['status', '--porcelain', '--', TOOL_DIR], workspace.path);
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[A-Z?!]+\s+/, ''))
    .filter((path) => path.startsWith('x-pack/'))
    .map((path) => ({
      path,
      content: Fs.readFileSync(Path.join(workspace.path, path), 'utf8'),
    }));
};

/** Promote an accepted candidate's code edits into the incumbent worktree. */
export const promoteEdits = ({
  edits,
  targetWorktree,
}: {
  edits: CodeEdit[];
  targetWorktree: string;
}): void => {
  for (const edit of edits) {
    const absolute = Path.join(targetWorktree, edit.path);
    Fs.mkdirSync(Path.dirname(absolute), { recursive: true });
    Fs.writeFileSync(absolute, edit.content);
  }
};

/** Unified diff of the candidate worktree, for the ledger and the report. */
export const candidateDiff = async (workspace: CandidateWorkspace): Promise<string> => {
  const { output } = await run('git', ['diff', '--', TOOL_DIR], workspace.path);
  return output.slice(0, 60_000);
};

/**
 * Write the edits, then prove they are safe to run: types, unit tests and lint all have to pass
 * before the candidate Kibana is allowed to pick them up.
 *
 * A model-written patch that does not typecheck or breaks the tool's own 63 unit tests is not a
 * harness variant worth spending a gate on — and running it would corrupt the comparison the
 * round is trying to make.
 */
export const applyAndValidateEdits = async ({
  workspace,
  edits,
  baseline,
  log,
}: {
  workspace: CandidateWorkspace;
  edits: CodeEdit[];
  /** Content of each file in the incumbent, used to lint what the edit *adds*. */
  baseline?: (path: string) => string | undefined;
  log: ToolingLog;
}): Promise<{ ok: boolean; failures: string[] }> => {
  // The edits are already on disk by the time this runs (the proposer wrote them), so the
  // pre-edit content comes from the incumbent's own version of the file, falling back to git.
  const before = new Map<string, string>();
  for (const edit of edits) {
    before.set(edit.path, baseline?.(edit.path) ?? (await gitShow(workspace, edit.path)));
  }
  const violations = lintCodeEdits(edits, (path) => before.get(path) ?? '');
  if (violations.length > 0) {
    return { ok: false, failures: violations };
  }

  for (const edit of edits) {
    const absolute = Path.join(workspace.path, edit.path);
    Fs.mkdirSync(Path.dirname(absolute), { recursive: true });
    Fs.writeFileSync(absolute, edit.content);
  }
  log.info(`[candidate] wrote ${edits.length} file(s) to ${workspace.path}`);

  const checks: Array<{ name: string; command: string; args: string[] }> = [
    {
      name: 'typecheck',
      command: 'node',
      args: [
        'scripts/type_check',
        '--project',
        'x-pack/platform/packages/shared/agent-builder/agent-builder-genai-utils/tsconfig.json',
      ],
    },
    { name: 'jest', command: 'node', args: ['scripts/jest', TOOL_DIR] },
    { name: 'eslint', command: 'node', args: ['scripts/eslint', TOOL_DIR] },
  ];

  const failures: string[] = [];
  for (const check of checks) {
    const result = await run(check.command, check.args, workspace.path);
    log.info(`[candidate] ${check.name}: ${result.ok ? 'pass' : 'FAIL'}`);
    if (!result.ok) {
      failures.push(`${check.name} failed:\n${result.output.slice(-1500)}`);
    }
  }

  return { ok: failures.length === 0, failures };
};

/**
 * Restart a lane's Kibana and wait until it answers again.
 *
 * A restart rather than relying on the dev server's watcher: the documentation corpus is read
 * once per process, and `.md` files are not watched at all, so an edit to them is invisible
 * until the process comes back. Measuring a variant whose files are on disk but not in memory is
 * the worst possible failure — it looks like a null result.
 */
export const restartLane = async ({
  command,
  url,
  log,
  env = {},
  timeoutMs = 600_000,
}: {
  command: string;
  url: string;
  log: ToolingLog;
  /** Extra environment for the restarted process, e.g. the model tier to pin. */
  env?: Record<string, string>;
  timeoutMs?: number;
}): Promise<boolean> => {
  const prefix = Object.entries(env)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(' ');
  log.info(`[lane] restarting via ${command}${prefix ? ` (${prefix})` : ''}`);
  await run('bash', ['-lc', `${prefix} ${command}`.trim()], process.cwd(), 120_000);

  const isUp = async (): Promise<boolean> => {
    try {
      return (await fetch(`${url}/api/status`)).ok;
    } catch (e) {
      return false;
    }
  };

  // Two phases, both required. Seeing the port go down is the only proof the *old* process is
  // gone: without it a fast status check succeeds against the process we were trying to replace,
  // and the round silently measures the previous code.
  const downDeadline = Date.now() + 120_000;
  let sawDown = false;
  while (Date.now() < downDeadline) {
    if (!(await isUp())) {
      sawDown = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (!sawDown) {
    log.error(`[lane] ${url} never went down — refusing to measure possibly stale code`);
    return false;
  }

  const upDeadline = Date.now() + timeoutMs;
  while (Date.now() < upDeadline) {
    if (await isUp()) {
      log.info(`[lane] ${url} is back with the new code`);
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  log.warning(`[lane] ${url} did not come back within the timeout`);
  return false;
};

/** Wait for the candidate Kibana to come back after its dev server reloads the edited files. */
export const waitForKibana = async ({
  url,
  log,
  timeoutMs = 600_000,
}: {
  url: string;
  log: ToolingLog;
  timeoutMs?: number;
}): Promise<boolean> => {
  const deadline = Date.now() + timeoutMs;
  let wasDown = false;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/api/status`);
      if (response.ok) {
        // The dev server restarts asynchronously after a file write: see it go down once before
        // trusting an "up", otherwise the round measures the pre-edit process.
        if (wasDown) {
          log.info('[candidate] Kibana back up with the new code');
          return true;
        }
      } else {
        wasDown = true;
      }
    } catch (e) {
      wasDown = true;
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  log.warning('[candidate] Kibana did not restart within the timeout');
  return false;
};
