/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'node:child_process';

// ---------------------------------------------------------------------------
// Runtime detection helpers (inlined from @kbn/evals-local/src/local/detect)
// ---------------------------------------------------------------------------

type RuntimeType = 'ollama' | 'lm-studio';

interface LoadedModel {
  name: string;
  size?: string;
}

interface DetectionResult {
  runtime: RuntimeType;
  endpoint: string | null;
  loadedModel: LoadedModel | null;
  serverWasRunning: boolean;
}

async function probeEndpoint(url: string, timeoutMs = 3000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return response.ok || response.status === 200;
  } catch {
    return false;
  }
}

async function getOllamaModels(endpoint: string): Promise<LoadedModel | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${endpoint}/api/ps`, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) return null;
    const data = (await response.json()) as { models?: Array<{ name: string; size?: number }> };
    if (data.models && data.models.length > 0) {
      const model = data.models[0];
      return {
        name: model.name,
        size: model.size ? `${Math.round(model.size / (1024 * 1024 * 1024))}GB` : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function getLmStudioModel(endpoint: string): Promise<LoadedModel | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${endpoint}/v1/models`, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) return null;
    const data = (await response.json()) as { data?: Array<{ id: string }> };
    if (data.data && data.data.length > 0) {
      return { name: data.data[0].id };
    }
    return null;
  } catch {
    return null;
  }
}

function commandExists(cmd: string): boolean {
  // execFileSync (no shell) — `cmd` is passed as a positional arg, never
  // interpolated into a command string. Avoids any future-shell-injection
  // risk if a caller ever accepts the binary name from user input.
  try {
    execFileSync('sh', ['-c', 'command -v "$1"', '_', cmd], {
      stdio: 'pipe',
      timeout: 5000,
    });
    return true;
  } catch {
    return false;
  }
}

async function detect(customEndpoint?: string): Promise<DetectionResult> {
  if (customEndpoint) {
    let isOllama = false;
    try {
      const parsedUrl = new URL(customEndpoint);
      isOllama = parsedUrl.port === '11434';
    } catch {
      isOllama = customEndpoint.includes(':11434');
    }
    const runtime: RuntimeType = isOllama ? 'ollama' : 'lm-studio';
    const baseEndpoint = customEndpoint.replace(/\/v1\/?$/, '');
    const loadedModel = isOllama
      ? await getOllamaModels(baseEndpoint)
      : await getLmStudioModel(baseEndpoint);
    return {
      runtime,
      endpoint: customEndpoint.replace(/\/+$/, '').endsWith('/v1')
        ? customEndpoint.replace(/\/+$/, '')
        : `${customEndpoint.replace(/\/+$/, '')}/v1`,
      loadedModel,
      serverWasRunning: true,
    };
  }

  const ollamaEndpoint = 'http://localhost:11434';
  const lmsEndpoint = 'http://localhost:1234';

  const ollamaRunning = await probeEndpoint(ollamaEndpoint);
  if (ollamaRunning) {
    const loadedModel = await getOllamaModels(ollamaEndpoint);
    return {
      runtime: 'ollama',
      endpoint: `${ollamaEndpoint}/v1`,
      loadedModel,
      serverWasRunning: true,
    };
  }

  const lmsRunning = await probeEndpoint(`${lmsEndpoint}/v1/models`);
  if (lmsRunning) {
    const loadedModel = await getLmStudioModel(lmsEndpoint);
    return {
      runtime: 'lm-studio',
      endpoint: `${lmsEndpoint}/v1`,
      loadedModel,
      serverWasRunning: true,
    };
  }

  if (commandExists('ollama')) {
    return {
      runtime: 'ollama',
      endpoint: null,
      loadedModel: null,
      serverWasRunning: false,
    };
  }

  if (commandExists('lms')) {
    return {
      runtime: 'lm-studio',
      endpoint: null,
      loadedModel: null,
      serverWasRunning: false,
    };
  }

  return {
    runtime: 'ollama',
    endpoint: null,
    loadedModel: null,
    serverWasRunning: false,
  };
}

// ---------------------------------------------------------------------------
// Local connector env helpers (inlined from @kbn/evals-local/src/local/connector_factory)
// ---------------------------------------------------------------------------

const LOCAL_CONNECTOR_ID = 'local-eval-model';

function setLocalConnectorEnv(endpoint: string, modelName: string): void {
  const normalized = endpoint.replace(/\/+$/, '');
  const apiUrl = normalized.endsWith('/v1')
    ? `${normalized}/chat/completions`
    : `${normalized}/v1/chat/completions`;

  const config = {
    [LOCAL_CONNECTOR_ID]: {
      name: `Local: ${modelName}`,
      actionTypeId: '.gen-ai',
      config: {
        apiUrl,
        apiProvider: 'Other',
        defaultModel: modelName,
      },
      secrets: {
        apiKey: 'local-eval',
      },
    },
  };

  process.env.KIBANA_TESTING_AI_CONNECTORS = Buffer.from(JSON.stringify(config)).toString('base64');
  process.env.EVALUATION_CONNECTOR_ID = LOCAL_CONNECTOR_ID;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const log = {
  info: (msg: string) => process.stderr.write(`[evals-local] ${msg}\n`),
};

/**
 * Lightweight connector injection for --local flag on any existing evals command.
 * Probes a running local endpoint, discovers the model name, and sets env vars.
 * Does NOT provision or teardown -- assumes the runtime is already running.
 */
export async function injectLocalConnector(args: string[]): Promise<void> {
  let localEndpoint: string | undefined;
  let localModel: string | undefined;

  const filteredArgs: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--local') continue;
    if (args[i] === '--local-endpoint') {
      const value = args[++i];
      if (!value || value.startsWith('--')) {
        throw new Error(`--local-endpoint requires a value, got: ${value}`);
      }
      localEndpoint = value;
      continue;
    }
    if (args[i] === '--local-model') {
      const value = args[++i];
      if (!value || value.startsWith('--')) {
        throw new Error(`--local-model requires a value, got: ${value}`);
      }
      localModel = value;
      continue;
    }
    filteredArgs.push(args[i]);
  }

  args.length = 0;
  args.push(...filteredArgs);

  const detection = await detect(localEndpoint);

  if (!detection.endpoint) {
    // Hard-fail rather than warn-and-return. The caller (scripts/evals.js)
    // chains `.then(() => cli.run())` unconditionally on the resolved promise,
    // so a silent return here would let @kbn/evals start with the default
    // CLOUD connector — silently producing eval results that look like local
    // model output but actually used Anthropic/OpenAI. That is a data-trust
    // regression: a user reading the eval report cannot tell their local
    // model was never invoked. Throw so the process exits visibly.
    throw new Error(
      '--local requires a running local runtime, but none was detected. ' +
        'Start Ollama (`ollama serve`) or LM Studio. ' +
        'Refusing to silently fall back to the cloud connector.'
    );
  }

  const modelName = localModel ?? detection.loadedModel?.name ?? 'local-model';
  setLocalConnectorEnv(detection.endpoint, modelName);
  log.info(`Local connector injected: ${modelName} at ${detection.endpoint}`);
}
