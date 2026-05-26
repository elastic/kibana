#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { suiteKeySafe } = require('./suite_key_safe');

const EVALUATIONS_INDEX = 'kibana-evaluations';
const MAX_LOG_EXCERPT_CHARS = 4000;
const MAX_SCORE_ROWS_PER_MODEL = 10;
const MAX_CONTEXT_JSON_BYTES = 30 * 1024;

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
 * @param {unknown} responseJson
 * @returns {string}
 */
/**
 * @returns {string}
 */
function resolveEvaluationConnectorId() {
  const fromEnv = process.env.EVALUATION_CONNECTOR_ID || '';
  if (fromEnv) {
    return fromEnv;
  }

  const configB64 = process.env.KBN_EVALS_CONFIG_B64 || '';
  if (!configB64) {
    return '';
  }

  try {
    const config = JSON.parse(Buffer.from(configB64, 'base64').toString('utf8'));
    return typeof config.evaluationConnectorId === 'string' ? config.evaluationConnectorId : '';
  } catch {
    return '';
  }
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
  projectKeySafe,
  failureLogMetadataKey,
  buildFailureScoresQuery,
  truncateText,
  groupLowScoresByRunId,
  expectedRunId,
  truncateContextJson,
  buildTriageUserPrompt,
  buildLitellmChatRequest,
  resolveEvaluationConnectorId,
  buildEisChatRequest,
  parseEisStreamResponse,
  parseLitellmChatContent,
};
