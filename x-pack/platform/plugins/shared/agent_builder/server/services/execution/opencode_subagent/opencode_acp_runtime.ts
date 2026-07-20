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
  iconType?: string;
  /** Connector instance id, when this call executed a connector sub-action. */
  connectorId?: string;
}

const shellInnerCommand = (value: string): string => {
  const trimmed = value.trim();
  const match = trimmed.match(/^(?:\/usr\/bin\/)?(?:bash|sh)\s+-lc\s+(.+)$/);
  if (!match?.[1]) {
    return trimmed;
  }
  return match[1].replace(/^['"]|['"]$/g, '').trim();
};

const firstShellToken = (value: string): string =>
  shellInnerCommand(value).trim().toLowerCase().split(/\s+/)[0] ?? '';

const commandMatches = (commandText: string, pattern: RegExp): boolean =>
  pattern.test(shellInnerCommand(commandText));

const classifyCommand = (commandText: string): Classification | undefined => {
  const normalized = shellInnerCommand(commandText);
  const firstToken = firstShellToken(commandText);

  if (firstToken === 'gcloud') {
    if (commandMatches(commandText, /\bgcloud\s+config\b/)) {
      return { phase: 'running', label: 'Inspected Google Cloud CLI config', iconType: 'gear' };
    }
    if (commandMatches(commandText, /\bgcloud\s+logging\b/)) {
      return { phase: 'running', label: 'Queried Google Cloud logs', iconType: 'logoGCP' };
    }
    if (commandMatches(commandText, /\bgcloud\s+run\b/)) {
      return { phase: 'running', label: 'Used Google Cloud Run', iconType: 'logoGCP' };
    }
    if (commandMatches(commandText, /\bgcloud\s+storage\b/)) {
      return { phase: 'running', label: 'Used Google Cloud Storage', iconType: 'logoGCP' };
    }
    return { phase: 'running', label: 'Ran Google Cloud CLI', iconType: 'logoGCP' };
  }

  if (firstToken === 'elastic' || /(?:^|\s)npx\s+-y\s+@elastic\/cli\b/.test(normalized)) {
    if (commandMatches(commandText, /\belastic\s+config\b/)) {
      return { phase: 'kibana', label: 'Inspected Elastic CLI config', iconType: 'gear' };
    }
    if (commandMatches(commandText, /\belastic\s+(?:es|stack\s+es)\b/)) {
      return {
        phase: 'kibana',
        label: 'Queried Elasticsearch with Elastic CLI',
        iconType: 'logoElasticsearch',
      };
    }
    if (commandMatches(commandText, /\belastic\s+(?:kb|stack\s+kb)\b/)) {
      return { phase: 'kibana', label: 'Queried Kibana with Elastic CLI', iconType: 'logoKibana' };
    }
    if (commandMatches(commandText, /\belastic\s+cloud\b/)) {
      return { phase: 'kibana', label: 'Ran Elastic Cloud CLI', iconType: 'cloudSunny' };
    }
    return { phase: 'kibana', label: 'Ran Elastic CLI', iconType: 'logoElasticsearch' };
  }

  if (firstToken === 'gh') {
    if (commandMatches(commandText, /\bgh\s+pr\s+create\b/)) {
      return { phase: 'running', label: 'Opened a GitHub PR', iconType: 'logoGithub' };
    }
    if (commandMatches(commandText, /\bgh\s+pr\b/)) {
      return { phase: 'running', label: 'Checked GitHub PRs', iconType: 'logoGithub' };
    }
    return { phase: 'running', label: 'Ran GitHub CLI', iconType: 'logoGithub' };
  }

  if (firstToken === 'git') {
    if (commandMatches(commandText, /\bgit\s+clone\b/)) {
      return { phase: 'running', label: 'Cloned repository', iconType: 'branch' };
    }
    if (commandMatches(commandText, /\bgit\s+(?:diff|status|log)\b/)) {
      return { phase: 'searching', label: 'Inspected git state', iconType: 'branch' };
    }
    if (commandMatches(commandText, /\bgit\s+commit\b/)) {
      return { phase: 'editing', label: 'Committed changes', iconType: 'branch' };
    }
    if (commandMatches(commandText, /\bgit\s+push\b/)) {
      return { phase: 'running', label: 'Pushed branch', iconType: 'branch' };
    }
    return { phase: 'running', label: 'Ran git', iconType: 'branch' };
  }

  if (firstToken === 'npm' || firstToken === 'yarn' || firstToken === 'pnpm') {
    if (commandMatches(commandText, /\b(?:npm|yarn|pnpm)\s+(?:install|add)\b/)) {
      return { phase: 'running', label: 'Installed dependencies', iconType: 'package' };
    }
    if (commandMatches(commandText, /\b(?:npm|yarn|pnpm)\s+(?:test|run\s+test)\b/)) {
      return { phase: 'running', label: 'Ran tests', iconType: 'beaker' };
    }
    return { phase: 'running', label: `Ran ${firstToken}`, iconType: 'console' };
  }

  if (commandMatches(commandText, /\bnode\s+scripts\/(?:jest|jest_integration)\b/)) {
    return { phase: 'running', label: 'Ran Jest tests', iconType: 'beaker' };
  }
  if (commandMatches(commandText, /\bnode\s+scripts\/eslint\b/)) {
    return { phase: 'running', label: 'Ran ESLint', iconType: 'check' };
  }
  if (commandMatches(commandText, /\bnode\s+scripts\/type_check\b/)) {
    return { phase: 'running', label: 'Ran type check', iconType: 'check' };
  }
  if (commandMatches(commandText, /\b(?:rg|grep)\b/)) {
    return { phase: 'searching', label: 'Searched the codebase', iconType: 'search' };
  }
  if (commandMatches(commandText, /\b(?:ls|pwd|cat|head|tail)\b/)) {
    return { phase: 'searching', label: 'Inspected files', iconType: 'folderOpen' };
  }
  if (commandMatches(commandText, /\b(?:curl|wget)\b/)) {
    return { phase: 'running', label: 'Called HTTP endpoint', iconType: 'globe' };
  }
  if (commandMatches(commandText, /\b(?:python|python3|node|tsx)\b/)) {
    return { phase: 'running', label: 'Ran script', iconType: 'console' };
  }
};

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
  const commandText = command ?? title ?? '';
  const commandClassification = commandText ? classifyCommand(commandText) : undefined;
  if (commandClassification) {
    return commandClassification;
  }

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
  const firstToken = firstShellToken(commandText);
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
/** Workspace-local GitHub CLI config directory (per-run, scrubbed). */
const GH_CONFIG_DIR = `${WORKSPACE}/.config/gh`;
const GH_HOSTS_PATH = `${GH_CONFIG_DIR}/hosts.yml`;
const GITHUB_ENV_PATH = `${WORKSPACE}/.github-env`;
const ELASTIC_CLI_CONFIG_PATH = `${WORKSPACE}/.elasticrc.yml`;
const ELASTIC_CLI_ENV_PATH = `${WORKSPACE}/.elastic-cli-env`;
const ELASTIC_CLI_PREFIX = `${WORKSPACE}/.elastic-cli-npm`;
const ELASTIC_CLI_BIN_DIR = `${ELASTIC_CLI_PREFIX}/bin`;
const GCP_CLI_CONFIG_DIR = `${WORKSPACE}/.gcloud`;
const GCP_CLI_CREDENTIAL_DIR = `${WORKSPACE}/.gcp`;
const GCP_CLI_ACCESS_TOKEN_PATH = `${GCP_CLI_CREDENTIAL_DIR}/access-token`;
const GCP_CLI_ENV_PATH = `${WORKSPACE}/.gcp-cli-env`;
const GCP_CLI_BIN_DIR = `${WORKSPACE}/google-cloud-sdk/bin`;
const GCP_CLI_BUNDLED_PYTHON = `${WORKSPACE}/google-cloud-sdk/platform/bundledpythonunix/bin/python3`;
const GCP_CLI_UV_BIN_DIR = `${WORKSPACE}/.uv-bin`;
const GCP_CLI_PYTHON_INSTALL_DIR = `${WORKSPACE}/.gcp-python`;
const GCP_CLI_PYTHON_PATH = `${GCP_CLI_PYTHON_INSTALL_DIR}/python3`;
const GCP_CLI_ARCHIVE_BASE_URL = 'https://dl.google.com/dl/cloudsdk/channels/rapid/downloads';

const shSingleQuote = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

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
    elasticCliCredentials,
    gcpCliCredentials,
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

      if (elasticCliCredentials) {
        upsert('elastic-cli-install', {
          phase: 'credential',
          label: 'Preparing Elastic CLI',
          status: 'in_progress',
          iconType: 'logoElasticsearch',
          credentialIconVariant: 'compute',
        });
        await this.ensureElasticCliInstalled(sandbox);
        upsert('elastic-cli-install', {
          phase: 'credential',
          label: 'Elastic CLI ready',
          status: 'completed',
          iconType: 'logoElasticsearch',
          credentialIconVariant: 'compute',
        });
        await this.injectElasticCliCredentials(sandbox, elasticCliCredentials);
        abortSignal?.throwIfAborted?.();
      }

      if (gcpCliCredentials) {
        upsert('gcp-cli-install', {
          phase: 'credential',
          label: 'Preparing Google Cloud CLI',
          status: 'in_progress',
          iconType: 'logoGCP',
          credentialIconVariant: 'compute',
        });
        await this.ensureGcpCliInstalled(sandbox);
        await this.injectGcpCliCredentials(sandbox, gcpCliCredentials);
        upsert('gcp-cli-install', {
          phase: 'credential',
          label: 'Google Cloud CLI ready',
          status: 'completed',
          iconType: 'logoGCP',
          credentialIconVariant: 'compute',
        });
        abortSignal?.throwIfAborted?.();
      }

      const envFiles = [
        gitCredentials ? GITHUB_ENV_PATH : undefined,
        elasticCliCredentials ? ELASTIC_CLI_ENV_PATH : undefined,
        gcpCliCredentials ? GCP_CLI_ENV_PATH : undefined,
      ].filter(Boolean);
      const credentialEnv = envFiles.map((path) => `. ${path}`).join(' && ');
      const credentialPrefix = credentialEnv ? `${credentialEnv} && ` : '';
      const child = sandbox.spawn([
        'sh',
        '-lc',
        `cd ${WORKSPACE} && ${credentialPrefix}OPENCODE_CONFIG=${CONFIG_PATH} opencode acp --log-level ERROR`,
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
              iconType: fresh.iconType ?? existing?.iconType,
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
      if (elasticCliCredentials) {
        await this.scrubElasticCliCredentials(sandbox).catch((e) =>
          this.logger.warn(`Failed to scrub Elastic CLI credentials: ${(e as Error).message}`)
        );
      }
      if (gcpCliCredentials) {
        await this.scrubGcpCliCredentials(sandbox).catch((e) =>
          this.logger.warn(`Failed to scrub Google Cloud CLI credentials: ${(e as Error).message}`)
        );
      }
    }
  }

  /**
   * Configure the sandbox's git and gh CLI to authenticate to github.com over
   * HTTPS using the provided token as the `x-access-token` password. Also
   * rewrites SSH/`git@` remotes to HTTPS so `git clone git@github.com:...`
   * still works.
   */
  private async injectGitCredentials(sandbox: Sandbox, creds: GitCredentials): Promise<void> {
    // The token is written to files (not passed on the command line) to avoid it
    // appearing in process listings. Git reads `.git-credentials`; gh reads the
    // default `$HOME/.config/gh/hosts.yml`. We also export GH_* vars for tools
    // that inherit OpenCode's environment, but the default hosts file is the
    // durable path when the runtime sanitizes env for shell tool calls.
    await sandbox.exec(`mkdir -p ${GH_CONFIG_DIR}`, { timeoutMs: 10_000 });
    await sandbox.putFiles([
      {
        path: GIT_CREDENTIALS_PATH,
        contents: `https://x-access-token:${creds.token}@github.com\n`,
      },
      {
        path: GITHUB_ENV_PATH,
        contents: [
          `export GH_CONFIG_DIR=${shSingleQuote(GH_CONFIG_DIR)}`,
          `export GH_TOKEN=${shSingleQuote(creds.token)}`,
          `export GITHUB_TOKEN=${shSingleQuote(creds.token)}`,
          '',
        ].join('\n'),
      },
      {
        path: GH_HOSTS_PATH,
        contents: [
          'github.com:',
          `  oauth_token: ${JSON.stringify(creds.token)}`,
          '  git_protocol: https',
          '',
        ].join('\n'),
      },
    ]);
    await sandbox.exec(
      [
        `mkdir -p "$HOME/.config/gh"`,
        `cp ${GH_HOSTS_PATH} "$HOME/.config/gh/hosts.yml"`,
        `git config --global credential.helper 'store --file=${GIT_CREDENTIALS_PATH}'`,
        `git config --global url."https://github.com/".insteadOf git@github.com:`,
        `git config --global url."https://github.com/".insteadOf ssh://git@github.com/`,
        `chmod 600 ${GIT_CREDENTIALS_PATH}`,
        `chmod 600 ${GITHUB_ENV_PATH}`,
        `chmod 600 ${GH_HOSTS_PATH}`,
        `chmod 600 "$HOME/.config/gh/hosts.yml"`,
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
        `rm -f ${GITHUB_ENV_PATH}`,
        `rm -rf ${GH_CONFIG_DIR}`,
        `rm -f "$HOME/.config/gh/hosts.yml"`,
        `git config --global --unset credential.helper 2>/dev/null || true`,
        `git config --global --unset-all url."https://github.com/".insteadOf 2>/dev/null || true`,
      ].join('; '),
      { timeoutMs: 10_000 }
    );
  }

  private async injectElasticCliCredentials(
    sandbox: Sandbox,
    creds: NonNullable<CodingRunParams['elasticCliCredentials']>
  ): Promise<void> {
    await sandbox.putFiles([
      { path: ELASTIC_CLI_CONFIG_PATH, contents: creds.configYml },
      {
        path: ELASTIC_CLI_ENV_PATH,
        contents: [
          `export ELASTIC_CLI_CONFIG_FILE=${shSingleQuote(ELASTIC_CLI_CONFIG_PATH)}`,
          `export PATH=${shSingleQuote(ELASTIC_CLI_BIN_DIR)}:$PATH`,
          '',
        ].join('\n'),
      },
    ]);
    await sandbox.exec(
      [`chmod 600 ${ELASTIC_CLI_CONFIG_PATH}`, `chmod 600 ${ELASTIC_CLI_ENV_PATH}`].join(' && '),
      { timeoutMs: 10_000 }
    );
    this.logger.info(`Injected Elastic CLI config (${creds.source}) into sandbox ${sandbox.id}`);
  }

  private async ensureElasticCliInstalled(sandbox: Sandbox): Promise<void> {
    const result = await sandbox.exec(
      [
        `export PATH=${shSingleQuote(ELASTIC_CLI_BIN_DIR)}:$PATH`,
        `(command -v elastic >/dev/null 2>&1 || npm install -g --prefix ${shSingleQuote(
          ELASTIC_CLI_PREFIX
        )} @elastic/cli)`,
        'command -v elastic',
      ].join(' && '),
      { timeoutMs: 120_000 }
    );
    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to install Elastic CLI in sandbox (exit ${result.exitCode}): ${
          result.stderr || result.stdout
        }`
      );
    }
  }

  private async scrubElasticCliCredentials(sandbox: Sandbox): Promise<void> {
    await sandbox.exec(`rm -f ${ELASTIC_CLI_CONFIG_PATH} ${ELASTIC_CLI_ENV_PATH}`, {
      timeoutMs: 10_000,
    });
  }

  private async injectGcpCliCredentials(
    sandbox: Sandbox,
    creds: NonNullable<CodingRunParams['gcpCliCredentials']>
  ): Promise<void> {
    await sandbox.exec(`mkdir -p ${GCP_CLI_CONFIG_DIR} ${GCP_CLI_CREDENTIAL_DIR}`, {
      timeoutMs: 10_000,
    });
    await sandbox.putFiles([
      { path: GCP_CLI_ACCESS_TOKEN_PATH, contents: creds.accessToken },
      {
        path: GCP_CLI_ENV_PATH,
        contents: [
          `export CLOUDSDK_CONFIG=${shSingleQuote(GCP_CLI_CONFIG_DIR)}`,
          `export CLOUDSDK_AUTH_ACCESS_TOKEN_FILE=${shSingleQuote(GCP_CLI_ACCESS_TOKEN_PATH)}`,
          `export CLOUDSDK_CORE_PROJECT=${shSingleQuote(creds.projectId)}`,
          `if [ -x ${shSingleQuote(
            GCP_CLI_BUNDLED_PYTHON
          )} ]; then export CLOUDSDK_PYTHON=${shSingleQuote(GCP_CLI_BUNDLED_PYTHON)}; fi`,
          `if [ -x ${shSingleQuote(
            GCP_CLI_PYTHON_PATH
          )} ]; then export CLOUDSDK_PYTHON=${shSingleQuote(GCP_CLI_PYTHON_PATH)}; fi`,
          `export PATH=${shSingleQuote(GCP_CLI_BIN_DIR)}:$PATH`,
          '',
        ].join('\n'),
      },
    ]);
    const result = await sandbox.exec(
      [
        `. ${GCP_CLI_ENV_PATH}`,
        `chmod 700 ${GCP_CLI_CONFIG_DIR} ${GCP_CLI_CREDENTIAL_DIR}`,
        `chmod 600 ${GCP_CLI_ACCESS_TOKEN_PATH} ${GCP_CLI_ENV_PATH}`,
        `gcloud config set auth/access_token_file ${shSingleQuote(
          GCP_CLI_ACCESS_TOKEN_PATH
        )} --quiet`,
        `gcloud config set project ${shSingleQuote(creds.projectId)} --quiet`,
      ].join(' && '),
      { timeoutMs: 60_000 }
    );
    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to configure Google Cloud CLI in sandbox (exit ${result.exitCode}): ${
          result.stderr || result.stdout
        }`
      );
    }
    this.logger.info(
      `Injected Google Cloud CLI config (${creds.source}) into sandbox ${sandbox.id}`
    );
  }

  private async ensureGcpCliInstalled(sandbox: Sandbox): Promise<void> {
    const result = await sandbox.exec(
      [
        `export PATH=${shSingleQuote(GCP_CLI_BIN_DIR)}:$PATH`,
        `if command -v python3 >/dev/null 2>&1; then export CLOUDSDK_PYTHON="$(command -v python3)"; fi`,
        `if [ -x ${shSingleQuote(
          GCP_CLI_BUNDLED_PYTHON
        )} ]; then export CLOUDSDK_PYTHON=${shSingleQuote(GCP_CLI_BUNDLED_PYTHON)}; fi`,
        `if [ -x ${shSingleQuote(
          GCP_CLI_PYTHON_PATH
        )} ]; then export CLOUDSDK_PYTHON=${shSingleQuote(GCP_CLI_PYTHON_PATH)}; fi`,
        `if ! command -v gcloud >/dev/null 2>&1 || ! gcloud --version >/dev/null 2>&1; then ` +
          `case "$(uname -m)" in ` +
          `x86_64|amd64) gcloud_archive="google-cloud-cli-linux-x86_64.tar.gz" ;; ` +
          `aarch64|arm64) gcloud_archive="google-cloud-cli-linux-arm.tar.gz" ;; ` +
          `*) echo "Unsupported sandbox architecture for Google Cloud CLI: $(uname -m)" >&2; exit 1 ;; ` +
          `esac && ` +
          `rm -rf ${shSingleQuote(`${WORKSPACE}/google-cloud-sdk`)} && ` +
          `curl -fsSL "${GCP_CLI_ARCHIVE_BASE_URL}/$gcloud_archive" -o /tmp/google-cloud-cli.tar.gz && ` +
          `tar -C ${shSingleQuote(WORKSPACE)} -xzf /tmp/google-cloud-cli.tar.gz && ` +
          `rm -f /tmp/google-cloud-cli.tar.gz; ` +
          `fi`,
        `if [ -x ${shSingleQuote(
          GCP_CLI_BUNDLED_PYTHON
        )} ]; then export CLOUDSDK_PYTHON=${shSingleQuote(GCP_CLI_BUNDLED_PYTHON)}; fi`,
        `if [ -z "$CLOUDSDK_PYTHON" ]; then ` +
          `mkdir -p ${shSingleQuote(GCP_CLI_UV_BIN_DIR)} ${shSingleQuote(
            GCP_CLI_PYTHON_INSTALL_DIR
          )} && ` +
          `curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR=${shSingleQuote(
            GCP_CLI_UV_BIN_DIR
          )} sh && ` +
          `UV_PYTHON_INSTALL_DIR=${shSingleQuote(GCP_CLI_PYTHON_INSTALL_DIR)} ${shSingleQuote(
            `${GCP_CLI_UV_BIN_DIR}/uv`
          )} python install 3.12 && ` +
          `ln -sf "$(UV_PYTHON_INSTALL_DIR=${shSingleQuote(
            GCP_CLI_PYTHON_INSTALL_DIR
          )} ${shSingleQuote(`${GCP_CLI_UV_BIN_DIR}/uv`)} python find 3.12)" ${shSingleQuote(
            GCP_CLI_PYTHON_PATH
          )} && ` +
          `export CLOUDSDK_PYTHON=${shSingleQuote(GCP_CLI_PYTHON_PATH)}; ` +
          `fi`,
        'gcloud --version',
      ].join(' && '),
      { timeoutMs: 180_000 }
    );
    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to install Google Cloud CLI in sandbox (exit ${result.exitCode}): ${
          result.stderr || result.stdout
        }`
      );
    }
  }

  private async scrubGcpCliCredentials(sandbox: Sandbox): Promise<void> {
    await sandbox.exec(
      `rm -rf ${GCP_CLI_CONFIG_DIR} ${GCP_CLI_CREDENTIAL_DIR} ${GCP_CLI_ENV_PATH}`,
      {
        timeoutMs: 10_000,
      }
    );
  }
}
