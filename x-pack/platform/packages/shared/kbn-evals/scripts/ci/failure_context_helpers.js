#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { suiteKeySafe } = require('./suite_key_safe');

const MAX_LOG_EXCERPT_CHARS = 4000;
const MAX_CONTEXT_JSON_BYTES = 30 * 1024;

// Triage/summary text is always generated with a small, low-cost LiteLLM model.
const DEFAULT_TRIAGE_MODEL_ID = 'litellm-llm-gateway-claude-haiku-4-5';

/**
 * @param {string} suiteId
 * @param {string} project
 * @returns {string}
 */
function failureLogMetadataKey(suiteId, project) {
  return `kbn-evals:suite-failure-log:${suiteKeySafe(suiteId)}:${suiteKeySafe(project)}`;
}

/**
 * @param {string | undefined | null} text
 * @param {number} maxChars
 * @returns {string}
 */
function truncateText(text, maxChars) {
  const value = String(text ?? '');
  if (value.length <= maxChars) {
    return value;
  }
  return value.slice(value.length - maxChars);
}

/**
 * @param {unknown} context
 * @param {number} [maxBytes]
 * @returns {string}
 */
function truncateContextJson(context, maxBytes = MAX_CONTEXT_JSON_BYTES) {
  let serialized = JSON.stringify(context);
  if (Buffer.byteLength(serialized, 'utf8') <= maxBytes) {
    return serialized;
  }

  const clone = JSON.parse(serialized);
  if (clone.models && typeof clone.models === 'object') {
    for (const model of Object.values(clone.models)) {
      if (model && typeof model === 'object' && typeof model.logExcerpt === 'string') {
        model.logExcerpt = truncateText(model.logExcerpt, 1500);
      }
    }
  }

  serialized = JSON.stringify(clone);
  if (Buffer.byteLength(serialized, 'utf8') <= maxBytes) {
    return serialized;
  }

  return serialized.slice(0, maxBytes);
}

/**
 * @param {Record<string, unknown>} context
 * @param {{ suiteName: string; suiteId: string; buildUrl?: string; buildId?: string; failingProjects: string[] }} header
 * @returns {string}
 */
function buildTriageUserPrompt(context, header) {
  const lines = [
    'Summarize why this LLM evaluation suite failed in CI for a Slack notification.',
    '',
    `Suite: ${header.suiteName} (${header.suiteId})`,
    `Failing models: ${header.failingProjects.map((p) => `\`${p}\``).join(', ')}`,
  ];

  if (header.buildUrl) {
    lines.push(`Build: ${header.buildUrl}`);
  }
  if (header.buildId) {
    lines.push(`Buildkite build id: ${header.buildId}`);
  }

  lines.push(
    '',
    'Failure context (JSON):',
    truncateContextJson(context),
    '',
    'Instructions:',
    '- Use plain, portable markdown so it renders in both Slack and GitHub: short bullets starting with "- ", and do not use bold, headings, links, or code fences.',
    '- Start with a one-line verdict that classifies the failure as one of: provider/infra issue (NOT actionable by the team, e.g. provider outage, 429/529 rate limits, gateway/timeout), eval-quality regression (action needed), or test/harness bug (action needed).',
    '- Explicitly state whether this looks like a transient model-provider issue or a real regression, and say which.',
    '- A clear signal of a real regression (not a provider issue) is the same failure across multiple unrelated providers/models; call this out when present.',
    '- Then add short bullets grouped by likely root cause, calling out per-model differences when relevant.',
    '- Keep the response under 1500 characters.',
    '- Do not invent failures not supported by the context.'
  );

  return lines.join('\n');
}

/**
 * Extract a short, single-line root-cause summary from a per-suite triage body.
 * The per-suite triage already leads with a one-line verdict, so we pull the
 * first meaningful bullet/sentence and strip Slack markdown noise.
 *
 * @param {string | undefined | null} triageBody
 * @param {number} [maxChars]
 * @returns {string}
 */
function extractSuiteRootCauseLine(triageBody, maxChars = 160) {
  const body = String(triageBody ?? '');
  if (!body.trim()) {
    return '';
  }

  // Prefer the first line after a "Triage summary" header, otherwise the first
  // non-empty content line that is not the alert header or a metadata line.
  const rawLines = body.split('\n').map((line) => line.trim());
  const triageHeaderIndex = rawLines.findIndex((line) => /triage summary/i.test(line));
  const candidateLines = triageHeaderIndex >= 0 ? rawLines.slice(triageHeaderIndex + 1) : rawLines;

  for (const line of candidateLines) {
    if (!line) {
      continue;
    }
    if (/^:[a-z_]+:/i.test(line)) {
      continue; // emoji alert header
    }
    if (/^\*.*\*$/.test(line)) {
      continue; // bold section header like *Failing models:*
    }
    if (/^[-•]\s*`/.test(line)) {
      continue; // bullet that is just a model id
    }
    if (/^<https?:\/\//.test(line)) {
      continue; // build link line
    }

    const cleaned = line
      .replace(/^[-•*]\s*/, '')
      .replace(/[*_`]/g, '')
      .trim();
    if (cleaned) {
      return truncateText(cleaned, maxChars);
    }
  }

  return '';
}

/**
 * Build the user prompt for the weekly cross-suite executive summary. Input is
 * the set of failing suites with their per-suite triage bodies; output asks the
 * model for a short roll-up that separates non-actionable provider/infra noise
 * from real regressions teams must fix.
 *
 * @param {Array<{ suiteId: string; suiteName?: string; failingProjects?: string[]; triageBody?: string }>} suites
 * @param {{ buildUrl?: string; totalSuites?: number }} [meta]
 * @returns {string}
 */
function buildWeeklyRollupUserPrompt(suites, meta = {}) {
  const lines = [
    'Write a short executive summary for a weekly LLM-evaluation CI run that had failing suites.',
    'The audience is the evals maintainers in a shared Slack channel; the goal is to tell at a glance which failures are non-actionable provider/infra noise vs real eval regressions a team must fix.',
    '',
    `Failing suites: ${suites.length}${
      typeof meta.totalSuites === 'number' ? ` of ${meta.totalSuites}` : ''
    }`,
  ];

  if (meta.buildUrl) {
    lines.push(`Build: ${meta.buildUrl}`);
  }

  lines.push('', 'Per-suite triage (already produced earlier in the run):');
  for (const suite of suites) {
    const failing =
      Array.isArray(suite.failingProjects) && suite.failingProjects.length > 0
        ? suite.failingProjects.join(', ')
        : 'unknown';
    lines.push(
      '',
      `### ${suite.suiteName || suite.suiteId} (${suite.suiteId})`,
      `Failing models: ${failing}`,
      truncateText(String(suite.triageBody ?? '').trim() || '(no per-suite triage available)', 1200)
    );
  }

  lines.push(
    '',
    'Instructions:',
    '- Use Slack-friendly markdown (3-5 short bullets, no code fences, no headers).',
    '- Lead with counts: how many suites are non-actionable provider/infra issues vs real regressions/test bugs.',
    '- Group suites by shared root cause (e.g. "3 suites failed from the same gpt-5.4 provider outage").',
    '- Explicitly flag which suites need team action and which can simply be retried.',
    '- Keep the whole response under 900 characters.',
    '- Do not invent failures not supported by the per-suite triage.'
  );

  return lines.join('\n');
}

/**
 * @param {Record<string, unknown>} connector
 * @param {Array<{ role: string; content: string }>} messages
 * @returns {{ url: string; headers: Record<string, string>; body: Record<string, unknown> }}
 */
function buildLitellmChatRequest(connector, messages) {
  const config = connector.config && typeof connector.config === 'object' ? connector.config : {};
  const secrets =
    connector.secrets && typeof connector.secrets === 'object' ? connector.secrets : {};

  const apiUrl = typeof config.apiUrl === 'string' ? config.apiUrl : '';
  const defaultModel = typeof config.defaultModel === 'string' ? config.defaultModel : '';
  const apiKey = typeof secrets.apiKey === 'string' ? secrets.apiKey : '';

  if (!apiUrl || !defaultModel || !apiKey) {
    throw new Error('LiteLLM connector is missing apiUrl, defaultModel, or apiKey');
  }

  return {
    url: apiUrl,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: {
      model: defaultModel,
      messages,
      temperature: 0.2,
      max_tokens: 800,
    },
  };
}

/**
 * @returns {Record<string, unknown> | null}
 */
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
 * Maps a LiteLLM connector id (e.g. litellm-llm-gateway-gpt-4o) to a LiteLLM model group name.
 *
 * @param {string} connectorId
 * @returns {string}
 */
function connectorIdToLitellmModel(connectorId) {
  const stripped = String(connectorId).replace(/^litellm-/, '');
  const prefix = 'llm-gateway-';
  if (stripped.startsWith(prefix)) {
    return `llm-gateway/${stripped.slice(prefix.length)}`;
  }
  return stripped;
}

/**
 * Build a minimal LiteLLM connector from vault config when KIBANA_TESTING_AI_CONNECTORS was not generated.
 *
 * @param {string} modelConnectorId
 * @returns {{ config: { apiUrl: string; defaultModel: string }; secrets: { apiKey: string } }}
 */
function buildLitellmConnectorFromVault(modelConnectorId) {
  const config = parseVaultConfig();
  const litellm = config?.litellm;
  const baseUrl =
    process.env.LITELLM_BASE_URL ||
    (litellm && typeof litellm === 'object' && typeof litellm.baseUrl === 'string'
      ? litellm.baseUrl
      : '');
  const apiKey =
    process.env.LITELLM_VIRTUAL_KEY ||
    (litellm && typeof litellm === 'object' && typeof litellm.virtualKey === 'string'
      ? litellm.virtualKey
      : '');
  if (!baseUrl || !apiKey) {
    throw new Error(
      'LiteLLM credentials are missing (set LITELLM_BASE_URL/LITELLM_VIRTUAL_KEY or KBN_EVALS_CONFIG_B64)'
    );
  }

  return {
    config: {
      apiUrl: `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`,
      defaultModel: connectorIdToLitellmModel(modelConnectorId),
    },
    secrets: { apiKey },
  };
}

/**
 * Decode KIBANA_TESTING_AI_CONNECTORS (base64-encoded JSON in CI, raw JSON locally).
 *
 * @returns {Record<string, { config?: Record<string, unknown>; secrets?: Record<string, unknown> }>}
 */
function decodeAiConnectors() {
  const raw = process.env.KIBANA_TESTING_AI_CONNECTORS || '';
  if (!raw) {
    return {};
  }

  const tryParse = (text) => {
    try {
      const parsed = JSON.parse(text);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  };

  const direct = tryParse(raw);
  if (direct) {
    return direct;
  }

  try {
    const decoded = tryParse(Buffer.from(raw, 'base64').toString('utf8'));
    return decoded ?? {};
  } catch {
    return {};
  }
}

/**
 * Resolve the LiteLLM model used to generate Slack/GitHub triage text.
 * override with `EVAL_TRIAGE_MODEL_ID`.
 *
 * @returns {string}
 */
function resolveTriageModelId() {
  return process.env.EVAL_TRIAGE_MODEL_ID || DEFAULT_TRIAGE_MODEL_ID;
}

function parseLitellmChatContent(responseJson) {
  if (!responseJson || typeof responseJson !== 'object') {
    throw new Error('LiteLLM response was not JSON');
  }

  const choices = /** @type {{ choices?: Array<{ message?: { content?: string } }> }} */ (
    responseJson
  ).choices;

  const content = choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('LiteLLM response did not include message content');
  }

  return content.trim();
}

module.exports = {
  MAX_LOG_EXCERPT_CHARS,
  MAX_CONTEXT_JSON_BYTES,
  DEFAULT_TRIAGE_MODEL_ID,
  decodeAiConnectors,
  resolveTriageModelId,
  failureLogMetadataKey,
  truncateText,
  truncateContextJson,
  buildTriageUserPrompt,
  buildWeeklyRollupUserPrompt,
  extractSuiteRootCauseLine,
  buildLitellmChatRequest,
  parseVaultConfig,
  connectorIdToLitellmModel,
  buildLitellmConnectorFromVault,
  parseLitellmChatContent,
};
