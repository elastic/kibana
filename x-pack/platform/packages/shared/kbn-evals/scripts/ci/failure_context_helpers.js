#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { execFileSync } = require('child_process');
const { writeFileSync } = require('fs');
const { suiteKeySafe } = require('./suite_key_safe');

const EVALUATIONS_INDEX = 'kibana-evaluations';
const MAX_LOG_EXCERPT_CHARS = 4000;
const MAX_SCORE_ROWS_PER_MODEL = 10;
const MAX_CONTEXT_JSON_BYTES = 30 * 1024;

// Triage/summary text is always generated with a LiteLLM model (the
// suite_owner_notify step has no ES cluster with EIS inference privileges, so EIS
// models cannot be called there).
// Used only as a last resort when no LiteLLM connectors can be discovered.
const DEFAULT_TRIAGE_MODEL_ID = 'litellm-llm-gateway-gpt-4o';

/**
 * @param {string} suiteId
 * @param {string} project
 * @returns {string}
 */
function failureLogMetadataKey(suiteId, project) {
  return `kbn-evals:suite-failure-log:${suiteKeySafe(suiteId)}:${suiteKeySafe(project)}`;
}

/**
 * @param {string} buildId
 * @param {string} suiteId
 * @returns {{ bool: { must: Array<Record<string, unknown>> } }}
 */
function buildFailureScoresQuery(buildId, suiteId) {
  return {
    bool: {
      must: [{ term: { 'ci.buildkite.build_id': buildId } }, { term: { 'suite.id': suiteId } }],
    },
  };
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
 * @param {unknown} value
 * @returns {number | null}
 */
function scoreSortValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return null;
}

/**
 * @param {Array<Record<string, unknown>>} hits
 * @param {{ maxRowsPerModel?: number }} [options]
 * @returns {Record<string, { runId: string; lowScores: Array<Record<string, unknown>> }>}
 */
function groupLowScoresByRunId(hits, options = {}) {
  const maxRows = options.maxRowsPerModel ?? MAX_SCORE_ROWS_PER_MODEL;
  /** @type {Record<string, Array<Record<string, unknown>>>} */
  const byRun = {};

  for (const hit of hits) {
    const source = hit._source ?? hit;
    if (!source || typeof source !== 'object') {
      continue;
    }

    const runId = typeof source.run_id === 'string' ? source.run_id : 'unknown';
    const example = source.example && typeof source.example === 'object' ? source.example : {};
    const dataset = example.dataset && typeof example.dataset === 'object' ? example.dataset : {};
    const evaluator =
      source.evaluator && typeof source.evaluator === 'object' ? source.evaluator : {};
    const task = source.task && typeof source.task === 'object' ? source.task : {};
    const taskModel = task.model && typeof task.model === 'object' ? task.model : {};

    const row = {
      exampleId: typeof example.id === 'string' ? example.id : undefined,
      datasetName: typeof dataset.name === 'string' ? dataset.name : undefined,
      evaluatorName: typeof evaluator.name === 'string' ? evaluator.name : undefined,
      score: scoreSortValue(evaluator.score),
      explanation:
        typeof evaluator.explanation === 'string'
          ? truncateText(evaluator.explanation, 500)
          : undefined,
      label: typeof evaluator.label === 'string' ? evaluator.label : undefined,
      taskModelId: typeof taskModel.id === 'string' ? taskModel.id : undefined,
    };

    if (!byRun[runId]) {
      byRun[runId] = [];
    }
    byRun[runId].push(row);
  }

  /** @type {Record<string, { runId: string; lowScores: Array<Record<string, unknown>> }>} */
  const grouped = {};

  for (const [runId, rows] of Object.entries(byRun)) {
    const sorted = rows.sort((a, b) => {
      const aScore = scoreSortValue(a.score);
      const bScore = scoreSortValue(b.score);
      if (aScore === null && bScore === null) {
        return 0;
      }
      if (aScore === null) {
        return -1;
      }
      if (bScore === null) {
        return 1;
      }
      return aScore - bScore;
    });

    grouped[runId] = {
      runId,
      lowScores: sorted.slice(0, maxRows),
    };
  }

  return grouped;
}

/**
 * @param {string} buildId
 * @param {string} project
 * @returns {string}
 */
function expectedRunId(buildId, project) {
  return `bk-${buildId}-${project}`;
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
      if (model && typeof model === 'object' && Array.isArray(model.lowScores)) {
        model.lowScores = model.lowScores.slice(0, 3);
        for (const row of model.lowScores) {
          if (row && typeof row === 'object' && typeof row.explanation === 'string') {
            row.explanation = truncateText(row.explanation, 200);
          }
        }
      }
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
    '- Use Slack-friendly markdown (short bullets, no code fences).',
    '- Start with a one-line verdict that classifies the failure as one of: provider/infra issue (NOT actionable by the team, e.g. provider outage, 429/529 rate limits, gateway/timeout), eval-quality regression (action needed), or test/harness bug (action needed).',
    '- Explicitly state whether this looks like a transient model-provider issue or a real regression, and say which.',
    '- A clear signal of a real regression (not a provider issue) is the same failure across multiple unrelated providers/models; call this out when present.',
    '- Then add short bullets grouped by likely root cause, calling out per-model differences when relevant.',
    '- If a model has a log excerpt but no score data, say it likely failed before scores were exported.',
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
 * @param {string} outputPath
 * @param {{ suiteId: string; suiteName: string; buildId?: string; buildUrl?: string; failingProjects: string[] }} options
 */
function writeMinimalFailureContext(outputPath, options) {
  const models = {};
  for (const project of options.failingProjects) {
    models[project] = { hasScoreData: false };
  }

  writeFileSync(
    outputPath,
    truncateContextJson({
      suiteId: options.suiteId,
      suiteName: options.suiteName,
      buildId: options.buildId || undefined,
      buildUrl: options.buildUrl || undefined,
      failingProjects: options.failingProjects,
      models,
    }),
    'utf8'
  );
}

/**
 * @param {string} suiteId
 * @returns {string}
 */
function evaluationConnectorMetadataKey(suiteId) {
  return `kbn-evals:evaluation-connector-id:${suiteKeySafe(suiteId)}`;
}

/**
 * @param {string} metadataKey
 * @returns {string}
 */
function readBuildkiteMetadata(metadataKey) {
  try {
    const stdout = execFileSync(
      'buildkite-agent',
      ['meta-data', 'get', metadataKey, '--default', ''],
      {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }
    );
    return String(stdout).trim();
  } catch {
    return '';
  }
}

/**
 * Same resolution order as eval LLM-as-a-judge: env, build metadata, vault.
 *
 * @param {{ readMetadata?: (key: string) => string }} [options]
 * @returns {string}
 */
function resolveEvaluationConnectorId(options = {}) {
  const readMetadata = options.readMetadata ?? readBuildkiteMetadata;

  const fromEnv = process.env.EVALUATION_CONNECTOR_ID || '';
  if (fromEnv) {
    return fromEnv;
  }

  const suiteId = process.env.EVAL_SUITE_ID || '';
  if (suiteId) {
    const fromMetadata = readMetadata(evaluationConnectorMetadataKey(suiteId));
    if (fromMetadata) {
      return fromMetadata;
    }
  }

  const config = parseVaultConfig();
  return typeof config?.evaluationConnectorId === 'string' ? config.evaluationConnectorId : '';
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
 * Sorted list of LiteLLM connector ids available in KIBANA_TESTING_AI_CONNECTORS.
 *
 * @returns {string[]}
 */
function listLitellmConnectorIds() {
  return Object.keys(decodeAiConnectors())
    .filter((id) => id.startsWith('litellm-'))
    .sort();
}

/**
 * Resolve the LiteLLM model used to generate Slack triage/summary text. A
 * LiteLLM model is always used because the suite_owner_notify step has no ES
 * cluster with EIS inference privileges. Resolution order:
 * 1. `EVAL_TRIAGE_MODEL_ID` env override.
 * 2. The configured LiteLLM connector when one is available.
 * 3. The default LiteLLM model when present among available connectors.
 * 4. The first available LiteLLM connector.
 * 5. The configured LiteLLM connector from vault.
 * 6. The default LiteLLM model id (constructed from vault LiteLLM credentials).
 *
 * @param {{ readMetadata?: (key: string) => string }} [options]
 * @returns {string}
 */
function resolveTriageModelId(options = {}) {
  const override = process.env.EVAL_TRIAGE_MODEL_ID || '';
  if (override) {
    return override;
  }

  const configuredModel = resolveEvaluationConnectorId(options);
  if (configuredModel.startsWith('litellm-')) {
    return configuredModel;
  }

  const litellmConnectorIds = listLitellmConnectorIds();
  if (litellmConnectorIds.includes(DEFAULT_TRIAGE_MODEL_ID)) {
    return DEFAULT_TRIAGE_MODEL_ID;
  }
  if (litellmConnectorIds.length > 0) {
    return litellmConnectorIds[0];
  }

  const config = parseVaultConfig();
  const vaultModel =
    typeof config?.evaluationConnectorId === 'string' ? config.evaluationConnectorId : '';
  if (vaultModel.startsWith('litellm-')) {
    return vaultModel;
  }

  return DEFAULT_TRIAGE_MODEL_ID;
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
  EVALUATIONS_INDEX,
  MAX_LOG_EXCERPT_CHARS,
  MAX_SCORE_ROWS_PER_MODEL,
  MAX_CONTEXT_JSON_BYTES,
  DEFAULT_TRIAGE_MODEL_ID,
  decodeAiConnectors,
  listLitellmConnectorIds,
  resolveTriageModelId,
  failureLogMetadataKey,
  buildFailureScoresQuery,
  truncateText,
  groupLowScoresByRunId,
  expectedRunId,
  truncateContextJson,
  buildTriageUserPrompt,
  buildWeeklyRollupUserPrompt,
  extractSuiteRootCauseLine,
  buildLitellmChatRequest,
  parseVaultConfig,
  connectorIdToLitellmModel,
  buildLitellmConnectorFromVault,
  writeMinimalFailureContext,
  evaluationConnectorMetadataKey,
  readBuildkiteMetadata,
  resolveEvaluationConnectorId,
  parseLitellmChatContent,
};
