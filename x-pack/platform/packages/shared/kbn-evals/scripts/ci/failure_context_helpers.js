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

// Triage always uses a LiteLLM judge (the suite_owner_notify step has no ES
// cluster with EIS inference privileges, so EIS judges cannot be called there).
// Used only as a last resort when no LiteLLM connectors can be discovered.
const DEFAULT_TRIAGE_JUDGE_ID = 'litellm-llm-gateway-gpt-4o';

/**
 * @param {string} value
 * @returns {string}
 */
function projectKeySafe(value) {
  return suiteKeySafe(value);
}

/**
 * @param {string} suiteId
 * @param {string} project
 * @returns {string}
 */
function failureLogMetadataKey(suiteId, project) {
  return `kbn-evals:suite-failure-log:${suiteKeySafe(suiteId)}:${projectKeySafe(project)}`;
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
    '- Group by likely root cause (provider outage, rate limits, infra/timeout, eval quality regression, test bug).',
    '- Call out per-model differences when relevant.',
    '- If a model has log excerpt but no score data, say it likely failed before scores were exported.',
    '- Keep the response under 1500 characters.',
    '- Do not invent failures not supported by the context.'
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
 * @param {string} judgeConnectorId
 * @returns {{ config: { apiUrl: string; defaultModel: string }; secrets: { apiKey: string } }}
 */
function buildLitellmConnectorFromVault(judgeConnectorId) {
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
      defaultModel: connectorIdToLitellmModel(judgeConnectorId),
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
 * Resolve the judge used for Slack triage summaries. Triage always uses a
 * LiteLLM judge because the suite_owner_notify step has no ES cluster with EIS
 * inference privileges. Resolution order:
 * 1. `EVAL_TRIAGE_JUDGE_ID` env override.
 * 2. The eval judge when it is already LiteLLM-backed (respects `models:judge:*`).
 * 3. The default LiteLLM judge when present among available connectors.
 * 4. The first available LiteLLM connector.
 * 5. The vault `evaluationConnectorId` when it is LiteLLM-backed.
 * 6. The default LiteLLM judge id (constructed from vault LiteLLM credentials).
 *
 * @param {{ readMetadata?: (key: string) => string }} [options]
 * @returns {string}
 */
function resolveTriageJudgeId(options = {}) {
  const override = process.env.EVAL_TRIAGE_JUDGE_ID || '';
  if (override) {
    return override;
  }

  const evalJudge = resolveEvaluationConnectorId(options);
  if (evalJudge.startsWith('litellm-')) {
    return evalJudge;
  }

  const litellmConnectorIds = listLitellmConnectorIds();
  if (litellmConnectorIds.includes(DEFAULT_TRIAGE_JUDGE_ID)) {
    return DEFAULT_TRIAGE_JUDGE_ID;
  }
  if (litellmConnectorIds.length > 0) {
    return litellmConnectorIds[0];
  }

  const config = parseVaultConfig();
  const vaultJudge =
    typeof config?.evaluationConnectorId === 'string' ? config.evaluationConnectorId : '';
  if (vaultJudge.startsWith('litellm-')) {
    return vaultJudge;
  }

  return DEFAULT_TRIAGE_JUDGE_ID;
}

/**
 * Credentials for direct EIS `/_inference/chat_completion` calls during CI triage.
 *
 * The API key must authenticate against the ES cluster being called, so pair it
 * to the URL source:
 * - A dedicated `EIS_INFERENCE_ES_URL` cluster uses `KIBANA_EIS_CCM_API_KEY`
 *   (falling back to `EVALUATIONS_ES_API_KEY`).
 * - The evaluations cluster (`EVALUATIONS_ES_URL`) uses its own client key
 *   `EVALUATIONS_ES_API_KEY`. The CCM key is the ES->EIS connected-mode key, not
 *   a client credential for the evaluations cluster, so it must not be used here.
 *
 * @returns {{ esUrl: string; apiKey: string }}
 */
function resolveEisInferenceCredentials() {
  const eisInferenceEsUrl = process.env.EIS_INFERENCE_ES_URL || '';
  const evaluationsEsUrl = process.env.EVALUATIONS_ES_URL || '';
  const ccmApiKey = process.env.KIBANA_EIS_CCM_API_KEY || '';
  const evaluationsApiKey = process.env.EVALUATIONS_ES_API_KEY || '';

  if (eisInferenceEsUrl) {
    const apiKey = ccmApiKey || evaluationsApiKey;
    if (!apiKey) {
      throw new Error(
        'KIBANA_EIS_CCM_API_KEY or EVALUATIONS_ES_API_KEY is required for EIS judge triage summaries'
      );
    }
    return { esUrl: eisInferenceEsUrl, apiKey };
  }

  if (evaluationsEsUrl) {
    if (!evaluationsApiKey) {
      throw new Error(
        'EVALUATIONS_ES_API_KEY is required for EIS judge triage against the evaluations cluster'
      );
    }
    return { esUrl: evaluationsEsUrl, apiKey: evaluationsApiKey };
  }

  throw new Error(
    'ES URL is required for EIS judge triage (set EIS_INFERENCE_ES_URL or EVALUATIONS_ES_URL)'
  );
}

/**
 * @param {Record<string, unknown>} connector
 * @param {Array<{ role: string; content: string }>} messages
 * @param {string} esUrl
 * @param {string} apiKey
 * @returns {{ url: string; headers: Record<string, string>; body: Record<string, unknown> }}
 */
function buildEisChatRequest(connector, messages, esUrl, apiKey) {
  const config = connector.config && typeof connector.config === 'object' ? connector.config : {};
  const inferenceId = typeof config.inferenceId === 'string' ? config.inferenceId : '';
  if (!inferenceId) {
    throw new Error('EIS connector is missing config.inferenceId');
  }

  const baseUrl = esUrl.replace(/\/$/, '');
  return {
    url: `${baseUrl}/_inference/chat_completion/${encodeURIComponent(inferenceId)}/_stream`,
    headers: {
      'content-type': 'application/json',
      authorization: `ApiKey ${apiKey}`,
    },
    body: {
      messages,
    },
  };
}

/**
 * @param {string} responseText
 * @returns {string}
 */
function parseEisStreamResponse(responseText) {
  const parts = [];
  for (const line of responseText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      continue;
    }

    const choices = parsed?.choices;
    if (!Array.isArray(choices)) {
      continue;
    }

    for (const choice of choices) {
      const deltaContent = choice?.delta?.content;
      if (typeof deltaContent === 'string') {
        parts.push(deltaContent);
      }
      const messageContent = choice?.message?.content;
      if (typeof messageContent === 'string') {
        parts.push(messageContent);
      }
    }
  }

  const content = parts.join('').trim();
  if (!content) {
    throw new Error('EIS stream response did not include message content');
  }

  return content;
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
  DEFAULT_TRIAGE_JUDGE_ID,
  decodeAiConnectors,
  listLitellmConnectorIds,
  resolveTriageJudgeId,
  projectKeySafe,
  failureLogMetadataKey,
  buildFailureScoresQuery,
  truncateText,
  groupLowScoresByRunId,
  expectedRunId,
  truncateContextJson,
  buildTriageUserPrompt,
  buildLitellmChatRequest,
  parseVaultConfig,
  connectorIdToLitellmModel,
  buildLitellmConnectorFromVault,
  writeMinimalFailureContext,
  evaluationConnectorMetadataKey,
  readBuildkiteMetadata,
  resolveEvaluationConnectorId,
  resolveEisInferenceCredentials,
  buildEisChatRequest,
  parseEisStreamResponse,
  parseLitellmChatContent,
};
