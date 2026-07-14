/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import {
  AcpStdioClient,
  extractToolText,
  type AcpMcpServer,
  type AcpSessionUpdate,
} from './acp_client';
import type {
  CodingRuntime,
  CodingRunParams,
  CodingRunResult,
  GitCredentials,
  RuntimeModelConfig,
  RuntimeToolAccess,
} from './coding_runtime';
import type { Sandbox } from './sandbox_provider';
import type { OpencodePhase, OpencodeItemStatus, OpencodeTodo, OpencodeRunProgress } from './types';

/** Max output kept per item, to bound payload size for the UI. */
const MAX_OUTPUT_CHARS = 4000;

const truncate = (text: string, max = 140): string =>
  text.length > max ? `${text.slice(0, max - 1)}\u2026` : text;

/** Keep the tail of streamed output (most recent is most relevant), capped. */
const capTail = (text: string, max = MAX_OUTPUT_CHARS): string =>
  text.length > max ? `\u2026${text.slice(text.length - max)}` : text;

/**
 * Pull the shell command out of an ACP tool_call's rawInput. OpenCode's execute
 * tool uses `command`; some variants use `cmd`/`script`/`args`.
 */
const extractCommand = (rawInput?: Record<string, unknown>): string | undefined => {
  if (!rawInput) return undefined;
  const candidate =
    rawInput.command ?? rawInput.cmd ?? rawInput.script ?? rawInput.input ?? rawInput.query;
  if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  if (Array.isArray(rawInput.args)) return rawInput.args.join(' ');
  return undefined;
};

/**
 * Parse an OpenCode `todowrite` tool call's todos from its rawInput (preferred)
 * or its output text (a JSON array of { content, status, priority }).
 */
const parseTodos = (
  rawInput?: Record<string, unknown>,
  outputText?: string
): OpencodeTodo[] | undefined => {
  const coerce = (arr: unknown): OpencodeTodo[] | undefined => {
    if (!Array.isArray(arr)) return undefined;
    const todos = arr
      .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
      .map((e) => ({
        content: String(e.content ?? e.text ?? e.title ?? ''),
        status: String(e.status ?? 'pending'),
      }))
      .filter((t) => t.content);
    return todos.length ? todos : undefined;
  };

  if (rawInput) {
    const fromInput = coerce(rawInput.todos ?? rawInput.entries ?? rawInput.items);
    if (fromInput) return fromInput;
  }
  if (outputText) {
    try {
      return coerce(JSON.parse(outputText));
    } catch {
      // not JSON; ignore
    }
  }
  return undefined;
};

const LANG_BY_EXT: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  py: 'python',
  json: 'json',
  yml: 'yaml',
  yaml: 'yaml',
  sh: 'bash',
  md: 'markdown',
  go: 'go',
  rs: 'rust',
  java: 'java',
};

const langFromPath = (path?: string): string | undefined => {
  if (!path) return undefined;
  const ext = path.split('.').pop()?.toLowerCase();
  return ext ? LANG_BY_EXT[ext] : undefined;
};

interface FileEdit {
  filePath?: string;
  fileContent?: string;
}

/**
 * Extract the file path + written content (or diff) from an edit/write tool
 * call's rawInput. OpenCode's write/edit tools use a few field-name variants.
 */
const extractFileEdit = (rawInput?: Record<string, unknown>): FileEdit | undefined => {
  if (!rawInput) return undefined;
  const str = (v: unknown): string | undefined =>
    typeof v === 'string' && v.length > 0 ? v : undefined;

  const filePath = str(rawInput.filePath) ?? str(rawInput.path) ?? str(rawInput.file);
  const content = str(rawInput.content) ?? str(rawInput.newString) ?? str(rawInput.new_string);

  const oldString = str(rawInput.oldString) ?? str(rawInput.old_string);
  let fileContent = content;
  if (!content && oldString) {
    fileContent = oldString;
  } else if (content && oldString) {
    fileContent = `- ${oldString.split('\n').join('\n- ')}\n+ ${content.split('\n').join('\n+ ')}`;
  }

  if (!filePath && !fileContent) return undefined;
  return { filePath, fileContent };
};

interface Classification {
  phase: OpencodePhase;
  label: string;
  /** Connector instance id, when this call executed a connector sub-action. */
  connectorId?: string;
}

/**
 * Classify an ACP tool_call into a phase + friendly label, using the tool
 * `kind` and the command/title. Prefers `kind` (structured) and falls back to
 * matching the command's first token.
 */
const classifyToolCall = ({
  title,
  kind,
  command,
  rawInput,
}: {
  title?: string;
  kind?: string;
  command?: string;
  rawInput?: Record<string, unknown>;
}): Classification => {
  const hay = `${title ?? ''} ${command ?? ''}`.toLowerCase();
  const firstToken = (command ?? title ?? '').trim().toLowerCase().split(/\s+/)[0] ?? '';

  if (hay.includes('execute_connector_sub_action')) {
    const connectorId =
      typeof rawInput?.connectorId === 'string' ? rawInput.connectorId : undefined;
    const subAction = typeof rawInput?.subAction === 'string' ? rawInput.subAction : undefined;
    const detail = [connectorId, subAction].filter(Boolean).join(' / ');
    return {
      phase: 'kibana',
      label: detail ? `Called connector: ${detail}` : 'Called a Kibana connector',
      connectorId,
    };
  }
  if (
    hay.includes('agent_builder') ||
    hay.includes('index_mapping') ||
    hay.includes('list_indices') ||
    hay.includes('platform_core')
  ) {
    return { phase: 'kibana', label: 'Queried Kibana via Agent Builder' };
  }
  if (firstToken === 'git' || firstToken === 'gh' || /^git\s|^gh\s/.test(hay)) {
    return { phase: 'running', label: 'Ran git' };
  }
  if (/todowrite|write_todos|update_plan/.test(hay)) {
    return { phase: 'todo', label: 'Updated the plan' };
  }
  switch (kind) {
    case 'edit':
      return { phase: 'editing', label: 'Edited files' };
    case 'read':
      return { phase: 'searching', label: 'Read files' };
    case 'search':
      return { phase: 'searching', label: 'Searched the codebase' };
    case 'execute':
      return { phase: 'running', label: 'Ran a command' };
    case 'fetch':
      return { phase: 'running', label: 'Fetched a resource' };
    case 'think':
      return { phase: 'thinking', label: 'Thinking' };
    default:
      break;
  }
  if (/^(edit|write|create|patch|apply)$/.test(firstToken)) {
    return { phase: 'editing', label: 'Edited files' };
  }
  if (/^(read|cat|ls|list|glob)$/.test(firstToken)) {
    return { phase: 'searching', label: 'Read files' };
  }
  if (/^(grep|rg|search|find)$/.test(firstToken)) {
    return { phase: 'searching', label: 'Searched the codebase' };
  }
  if (command || firstToken === 'bash' || firstToken === 'sh') {
    return { phase: 'running', label: 'Ran a command' };
  }
  return { phase: 'tool', label: 'Used a tool' };
};

/** Absolute workspace path inside the sandbox. */
const WORKSPACE = '/workspace';
const CONFIG_PATH = `${WORKSPACE}/opencode.json`;
/** Where the git HTTPS credential is stored inside the sandbox (per-run, scrubbed). */
const GIT_CREDENTIALS_PATH = `${WORKSPACE}/.git-credentials`;

/**
 * OpenCode coding runtime, driven over ACP (LAYER 2).
 *
 * Given a ready `Sandbox`, it writes `opencode.json` (model routing + MCP
 * loopback), launches `opencode acp` via `sandbox.spawn(...)`, drives the ACP
 * session, and emits the UI activity timeline. It never provisions or tears down
 * the sandbox — the lifecycle layer owns that.
 */
export class OpenCodeAcpRuntime implements CodingRuntime {
  readonly id = 'opencode';
  readonly protocol = 'acp' as const;

  constructor(private readonly logger: Logger) {}

  private buildConfig(model: RuntimeModelConfig, tools: RuntimeToolAccess): string {
    return JSON.stringify(
      {
        $schema: 'https://opencode.ai/config.json',
        model: `litellm/${model.orchestratorModel}`,
        provider: {
          litellm: {
            npm: '@ai-sdk/openai-compatible',
            name: 'Elastic LiteLLM',
            options: { baseURL: model.baseUrl, apiKey: model.apiKey ?? '' },
            models: {
              [model.orchestratorModel]: { name: model.orchestratorModel },
              [model.coderModel]: { name: model.coderModel },
            },
          },
        },
        agent: {
          build: { mode: 'primary', model: `litellm/${model.orchestratorModel}` },
          general: { mode: 'subagent', model: `litellm/${model.coderModel}` },
          explore: { mode: 'subagent', model: `litellm/${model.coderModel}` },
        },
        mcp: {
          agent_builder: {
            type: 'remote',
            url: tools.mcpUrl,
            enabled: true,
            oauth: false,
            headers: {
              Authorization: tools.mcpAuthHeader,
              Accept: 'application/json, text/event-stream',
              'kbn-xsrf': 'true',
              // Bypass ngrok's free-tier browser interstitial when the MCP
              // loopback is tunneled through ngrok (harmless otherwise).
              'ngrok-skip-browser-warning': 'true',
            },
          },
        },
      },
      null,
      2
    );
  }

  async run({
    sandbox,
    prompt,
    modelConfig,
    toolAccess,
    systemPrompt,
    gitCredentials,
    timeoutMs,
    onProgress,
    abortSignal,
  }: CodingRunParams): Promise<CodingRunResult> {
    const toolCalls: string[] = [];
    const timeline: OpencodeRunProgress[] = [];
    const itemsById = new Map<string, OpencodeRunProgress>();
    let answer = '';
    let client: AcpStdioClient | undefined;
    const acpMcp: AcpMcpServer[] = [];

    const upsert = (
      id: string,
      patch: Partial<OpencodeRunProgress> & Pick<OpencodeRunProgress, 'phase' | 'label'>
    ) => {
      let item = itemsById.get(id);
      if (!item) {
        item = { id, status: 'in_progress', ...patch };
        itemsById.set(id, item);
        timeline.push(item);
      } else {
        Object.assign(item, patch);
      }
      onProgress?.({ ...item });
    };

    const acpStatusToItem = (s?: string): OpencodeItemStatus =>
      s === 'completed' ? 'completed' : s === 'failed' ? 'failed' : 'in_progress';

    try {
      // Write config (fresh MCP credential each turn, so rewrite even when warm).
      await sandbox.putFiles([
        { path: CONFIG_PATH, contents: this.buildConfig(modelConfig, toolAccess) },
      ]);
      abortSignal?.throwIfAborted?.();

      // Inject git credentials for real clone/push/PR. Written each turn (and
      // scrubbed in `finally`) so a warm-reused sandbox never retains the token
      // across runs. Uses the HTTPS credential store with x-access-token.
      if (gitCredentials) {
        await this.injectGitCredentials(sandbox, gitCredentials);
        abortSignal?.throwIfAborted?.();
      }

      const child = sandbox.spawn([
        'sh',
        '-lc',
        `cd ${WORKSPACE} && OPENCODE_CONFIG=${CONFIG_PATH} opencode acp --log-level ERROR`,
      ]);
      child.stderr.on('data', (d) => this.logger.debug(`[opencode acp] ${d.toString().trim()}`));

      const onUpdate = (update: AcpSessionUpdate) => {
        switch (update.sessionUpdate) {
          case 'agent_message_chunk':
            if (update.content?.type === 'text') {
              answer += update.content.text;
            }
            break;
          case 'agent_thought_chunk':
            if (update.content?.type === 'text') {
              const prev = itemsById.get('thinking')?.output ?? '';
              upsert('thinking', {
                phase: 'thinking',
                label: 'Thinking',
                status: 'in_progress',
                output: capTail(prev + update.content.text),
              });
            }
            break;
          case 'tool_call':
          case 'tool_call_update': {
            const key = update.toolCallId ?? `tool-${timeline.length}`;
            const existing = itemsById.get(key);
            const command = extractCommand(update.rawInput);
            const outputDelta = extractToolText(update.toolContent);
            if (update.title) toolCalls.push(update.title);

            const isTodo =
              /todowrite|write_todos|update_plan/i.test(update.title ?? '') ||
              existing?.phase === 'todo';
            if (isTodo) {
              const planItem = itemsById.get('plan');
              const todos = parseTodos(update.rawInput, outputDelta) ?? planItem?.todos;
              const done = todos?.filter((t) => t.status === 'completed').length ?? 0;
              const allDone = todos?.length ? done === todos.length : false;
              upsert('plan', {
                phase: 'todo',
                label: todos?.length ? `Plan (${done}/${todos.length} done)` : 'Updated the plan',
                status: allDone ? 'completed' : 'in_progress',
                todos,
              });
              break;
            }

            const fresh = classifyToolCall({
              title: update.title,
              kind: update.kind,
              command,
              rawInput: update.rawInput,
            });
            const useExisting = existing && existing.phase !== 'tool' && fresh.phase === 'tool';
            const phase = useExisting ? existing!.phase : fresh.phase;
            const label = useExisting ? existing!.label : fresh.label;

            const edit = phase === 'editing' ? extractFileEdit(update.rawInput) : undefined;
            const filePath = edit?.filePath ?? existing?.filePath;
            const fileContent = edit?.fileContent ?? existing?.fileContent;

            const finalCommand = command ?? existing?.command;
            // OpenCode's ACP sends the *cumulative* tool output on each update
            // (not an incremental delta), so appending duplicates it. If the new
            // content already contains the previous output, replace; else append.
            const prevOutput = existing?.output ?? '';
            const nextOutput =
              outputDelta === undefined
                ? prevOutput
                : !prevOutput || outputDelta.includes(prevOutput)
                ? outputDelta
                : `${prevOutput}${outputDelta}`;
            const mergedOutput = capTail(nextOutput);
            upsert(key, {
              phase,
              label: phase === 'editing' && filePath ? `Edited ${filePath}` : label,
              status: acpStatusToItem(update.status),
              command: finalCommand,
              detail:
                filePath ??
                (finalCommand ? truncate(finalCommand) : existing?.detail ?? update.title),
              output: mergedOutput || undefined,
              filePath,
              fileContent: fileContent ? capTail(fileContent) : undefined,
              fileLanguage: langFromPath(filePath),
              connectorId: fresh.connectorId ?? existing?.connectorId,
            });
            break;
          }
          case 'plan': {
            const todos: OpencodeTodo[] = (update.entries ?? []).map((e) => ({
              content: String(e.content ?? ''),
              status: String(e.status ?? 'pending'),
            }));
            const done = todos.filter((t) => t.status === 'completed').length;
            upsert('plan', {
              phase: 'todo',
              label: todos.length ? `Plan (${done}/${todos.length} done)` : 'Updated the plan',
              status: 'in_progress',
              todos,
            });
            break;
          }
          default:
            break;
        }
      };

      client = new AcpStdioClient(child.stdin, child.stdout, this.logger, { onUpdate });

      const abortHandler = () => {
        client?.close();
        child.kill('SIGTERM');
      };
      abortSignal?.addEventListener?.('abort', abortHandler, { once: true });

      await client.initialize();
      const sessionId = await client.newSession({ cwd: WORKSPACE, mcpServers: acpMcp });

      // Prepend dynamically-composed instructions (available connectors + how to
      // call them) so the agent's behavior matches what the scoped credential
      // permits. Kept as a prompt prefix for now (runtime-neutral).
      const fullPrompt = systemPrompt ? `${systemPrompt}\n\n---\n\n${prompt}` : prompt;

      const promptResult = await client.prompt({
        sessionId,
        text: fullPrompt,
        timeoutMs,
      });

      abortSignal?.removeEventListener?.('abort', abortHandler);
      child.kill('SIGTERM');
      for (const item of timeline) {
        if (item.status === 'in_progress' && item.phase !== 'todo') item.status = 'completed';
      }

      return {
        answer: answer.trim(),
        stopReason: promptResult.stopReason,
        timeline,
        toolCalls,
      };
    } finally {
      client?.close();
      // Scrub git credentials so a warm-reused sandbox never keeps the token
      // between turns (defense-in-depth; the executor also relies on short PAT
      // expiry). Best-effort — never fail the run on cleanup.
      if (gitCredentials) {
        await this.scrubGitCredentials(sandbox).catch((e) =>
          this.logger.warn(`Failed to scrub git credentials: ${(e as Error).message}`)
        );
      }
    }
  }

  /**
   * Configure the sandbox's git to authenticate to github.com over HTTPS using
   * the provided token as the `x-access-token` password. Also rewrites SSH/`git@`
   * remotes to HTTPS so `git clone git@github.com:...` still works.
   */
  private async injectGitCredentials(sandbox: Sandbox, creds: GitCredentials): Promise<void> {
    // The token is written to a file (not passed on the command line) to avoid
    // it appearing in process listings. `credential.helper store` reads it.
    await sandbox.putFiles([
      {
        path: GIT_CREDENTIALS_PATH,
        contents: `https://x-access-token:${creds.token}@github.com\n`,
      },
    ]);
    await sandbox.exec(
      [
        `git config --global credential.helper 'store --file=${GIT_CREDENTIALS_PATH}'`,
        `git config --global url."https://github.com/".insteadOf git@github.com:`,
        `git config --global url."https://github.com/".insteadOf ssh://git@github.com/`,
        // gh CLI (if present) reads GH_TOKEN from a login; make the token usable.
        `chmod 600 ${GIT_CREDENTIALS_PATH}`,
      ].join(' && '),
      { timeoutMs: 10_000 }
    );
    this.logger.info(
      `Injected git credentials (connector ${creds.connectorId}) into sandbox ${sandbox.id}`
    );
  }

  private async scrubGitCredentials(sandbox: Sandbox): Promise<void> {
    await sandbox.exec(
      [
        `rm -f ${GIT_CREDENTIALS_PATH}`,
        `git config --global --unset credential.helper 2>/dev/null || true`,
        `git config --global --unset-all url."https://github.com/".insteadOf 2>/dev/null || true`,
      ].join('; '),
      { timeoutMs: 10_000 }
    );
  }
}
