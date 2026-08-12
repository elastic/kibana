#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generate `KIBANA_TESTING_AI_CONNECTORS` payload for @kbn/evals from OpenRouter.
 *
 * Generates OpenAI-compatible `.gen-ai` connectors only for the models requested
 * via `--models` / `EVAL_MODEL_GROUPS`. Each model is validated against
 * `GET {baseUrl}/models`. EIS (`eis/*`) entries are skipped (handled separately).
 *
 * Auth: OpenRouter API key via Authorization Bearer.
 */

const { slugifyId } = require('./slugify_id');

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
const OPENROUTER_CONNECTOR_PREFIX = 'openrouter-';

function parseArgs(argv, { defaults = {} } = {}) {
  const out = { ...defaults };
  const rest = [];

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--') {
      rest.push(...argv.slice(i + 1));
      break;
    }

    if (!token.startsWith('--')) {
      rest.push(token);
      continue;
    }

    const eqIdx = token.indexOf('=');
    if (eqIdx !== -1) {
      const key = token.slice(2, eqIdx);
      const value = token.slice(eqIdx + 1);
      out[key] = value;
      continue;
    }

    const key = token.slice(2);
    const next = argv[i + 1];
    if (next == null || next.startsWith('--')) {
      out[key] = 'true';
      continue;
    }

    out[key] = next;
    i++;
  }

  out._ = rest;
  return out;
}

function die(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function getArg(argv, name, envName) {
  return argv[name] || (envName ? process.env[envName] : undefined);
}

function parseModelList(raw) {
  if (!raw) return [];
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function connectorIdForModel(modelId) {
  return `${OPENROUTER_CONNECTOR_PREFIX}${slugifyId(modelId)}`;
}

/**
 * Drop empties and EIS groups; keep native OpenRouter ids and openrouter-* connector ids.
 */
function filterRequestedModels(models) {
  return models.filter((m) => {
    if (!m) return false;
    if (m.startsWith('eis/')) return false;
    return true;
  });
}

async function httpJson(url, apiKey) {
  if (typeof fetch !== 'function') {
    die('Global fetch is not available in this Node runtime.');
  }

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });

  const text = await res.text();
  if (!res.ok) {
    die(`OpenRouter request failed: ${res.status} ${res.statusText}\n${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    die(`Failed to parse OpenRouter JSON response from ${url}\n${text}`);
  }
}

/**
 * @returns {Promise<Map<string, string>>} map of model id → model id, plus connector id → model id
 */
async function fetchAvailableModels(baseUrl, apiKey) {
  const response = await httpJson(`${baseUrl}/models`, apiKey);
  const entries = response && Array.isArray(response.data) ? response.data : [];
  /** @type {Map<string, string>} */
  const byId = new Map();
  /** @type {Map<string, string>} */
  const byConnectorId = new Map();

  for (const entry of entries) {
    const id = entry && typeof entry === 'object' ? entry.id : undefined;
    if (typeof id !== 'string' || !id.trim()) continue;
    const modelId = id.trim();
    byId.set(modelId, modelId);
    byConnectorId.set(connectorIdForModel(modelId), modelId);
  }

  return { byId, byConnectorId };
}

/**
 * Resolve a requested token (native model id or openrouter-* connector id) to a native OpenRouter model id.
 */
function resolveModelId(requested, { byId, byConnectorId }) {
  if (byId.has(requested)) {
    return byId.get(requested);
  }
  if (requested.startsWith(OPENROUTER_CONNECTOR_PREFIX) && byConnectorId.has(requested)) {
    return byConnectorId.get(requested);
  }
  return undefined;
}

function buildConnector(modelId, baseUrl, apiKey) {
  const connectorId = connectorIdForModel(modelId);
  const chatUrl = `${baseUrl}/chat/completions`;

  return {
    connectorId,
    connector: {
      name: `OpenRouter ${modelId}`,
      actionTypeId: '.gen-ai',
      config: {
        apiProvider: 'Other',
        apiUrl: chatUrl,
        enableNativeFunctionCalling: true,
        defaultModel: modelId,
      },
      secrets: {
        apiKey,
      },
    },
  };
}

async function main() {
  const argv = parseArgs(process.argv.slice(2), {
    defaults: {
      'base-url': DEFAULT_BASE_URL,
      format: 'base64',
    },
  });

  const baseUrl = String(
    getArg(argv, 'base-url', 'OPENROUTER_BASE_URL') || DEFAULT_BASE_URL
  ).replace(/\/+$/, '');
  const apiKey = getArg(argv, 'api-key', 'OPENROUTER_API_KEY');
  if (!apiKey) {
    die('Missing --api-key (or set OPENROUTER_API_KEY).');
  }

  const modelsRaw = getArg(argv, 'models') || process.env.EVAL_MODEL_GROUPS || '';
  const requested = filterRequestedModels(parseModelList(modelsRaw));
  if (requested.length === 0) {
    die(
      'No OpenRouter models requested. Pass --models or set EVAL_MODEL_GROUPS with non-eis model ids (e.g. openai/gpt-4o).'
    );
  }

  const available = await fetchAvailableModels(baseUrl, apiKey);
  const missing = [];
  const resolved = [];

  for (const token of requested) {
    const modelId = resolveModelId(token, available);
    if (!modelId) {
      missing.push(token);
      continue;
    }
    resolved.push(modelId);
  }

  if (missing.length > 0) {
    die(
      `OpenRouter model(s) not found via GET ${baseUrl}/models:\n` +
        missing.map((m) => `  - ${m}`).join('\n')
    );
  }

  const connectors = {};
  for (const modelId of resolved) {
    const { connectorId, connector } = buildConnector(modelId, baseUrl, apiKey);
    connectors[connectorId] = connector;
  }

  const format = String(argv.format || 'base64').toLowerCase();
  const json = JSON.stringify(connectors);
  if (format === 'json') {
    process.stdout.write(`${json}\n`);
    return;
  }

  if (format !== 'base64' && format !== 'b64') {
    die(`Unknown --format "${argv.format}". Use "base64" or "json".`);
  }

  process.stdout.write(`${Buffer.from(json, 'utf-8').toString('base64')}\n`);
}

main().catch((e) => {
  die(e && e.stack ? e.stack : String(e));
});
