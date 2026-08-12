#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

function tryParseJson(text) {
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Parse a value that may be raw JSON or base64-encoded JSON into an object.
 * Returns `{}` when the value is empty or cannot be parsed.
 */
function parseMaybeBase64Json(raw) {
  if (!raw) {
    return {};
  }

  const direct = tryParseJson(raw);
  if (direct) {
    return direct;
  }

  try {
    const decoded = tryParseJson(Buffer.from(raw, 'base64').toString('utf8'));
    return decoded ?? {};
  } catch {
    return {};
  }
}

function parseVaultConfig() {
  const configB64 = process.env.KBN_EVALS_CONFIG_B64 || '';
  if (!configB64) {
    return null;
  }

  try {
    const config = JSON.parse(Buffer.from(configB64, 'base64').toString('utf8'));
    return config && typeof config === 'object' ? config : null;
  } catch {
    return null;
  }
}

/**
 * Maps an OpenRouter connector id (e.g. openrouter-openai-gpt-4o) to an OpenRouter model id.
 *
 * Strips the `openrouter-` prefix and replaces the first `-` with `/` so
 * `openrouter-openai-gpt-4o` → `openai/gpt-4o`. Matches OpenRouter's
 * `provider/model` shape.
 */
function connectorIdToOpenrouterModel(connectorId) {
  const raw = String(connectorId);
  if (raw.includes('/') && !raw.startsWith('openrouter-')) {
    return raw;
  }

  const stripped = raw.replace(/^openrouter-/, '');
  const dashIdx = stripped.indexOf('-');
  if (dashIdx === -1) {
    return stripped;
  }
  return `${stripped.slice(0, dashIdx)}/${stripped.slice(dashIdx + 1)}`;
}

/**
 * Build a minimal OpenRouter connector from vault config when KIBANA_TESTING_AI_CONNECTORS was not generated.
 */
function buildOpenrouterConnectorFromVault(modelConnectorId) {
  const config = parseVaultConfig();
  const openrouter = config?.openrouter;
  const baseUrl = (
    process.env.OPENROUTER_BASE_URL ||
    (openrouter && typeof openrouter === 'object' && typeof openrouter.baseUrl === 'string'
      ? openrouter.baseUrl
      : '')
  ).replace(/\/+$/, '');
  const apiKey =
    process.env.OPENROUTER_API_KEY ||
    (openrouter && typeof openrouter === 'object' && typeof openrouter.apiKey === 'string'
      ? openrouter.apiKey
      : '');
  if (!baseUrl || !apiKey) {
    throw new Error(
      'OpenRouter credentials are missing (set OPENROUTER_BASE_URL/OPENROUTER_API_KEY or KBN_EVALS_CONFIG_B64)'
    );
  }

  const defaultModel =
    process.env.EVAL_OPENROUTER_MODEL || connectorIdToOpenrouterModel(modelConnectorId);
  if (!defaultModel || !defaultModel.includes('/')) {
    throw new Error(
      `Unable to resolve OpenRouter model id from connector "${modelConnectorId}". ` +
        'Pass a native id (provider/model) or set EVAL_OPENROUTER_MODEL.'
    );
  }

  return {
    config: {
      apiUrl: `${baseUrl}/chat/completions`,
      defaultModel,
    },
    secrets: { apiKey },
  };
}

module.exports = {
  parseMaybeBase64Json,
  parseVaultConfig,
  connectorIdToOpenrouterModel,
  buildOpenrouterConnectorFromVault,
};
