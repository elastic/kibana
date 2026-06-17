#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const {
  buildWeeklyRollupUserPrompt,
  buildLitellmChatRequest,
  buildLitellmConnectorFromVault,
  resolveTriageModelId,
  parseLitellmChatContent,
  decodeAiConnectors,
} = require('./failure_context_helpers');

const maxOutputChars = Number(process.env.EVAL_WEEKLY_SUMMARY_MAX_CHARS || '900');

/**
 * @param {string} url
 * @param {Record<string, string>} headers
 * @param {Record<string, unknown>} body
 * @returns {Promise<string>}
 */
async function postForContent(url, headers, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const text = await response.text();
  if (!response.ok) {
    let detail = text.slice(0, 500);
    try {
      const json = JSON.parse(text);
      if (json && typeof json === 'object' && 'error' in json) {
        detail = JSON.stringify(json.error);
      }
    } catch {
      // keep text slice
    }
    throw new Error(`Inference request failed (${response.status}): ${detail}`);
  }

  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error('Inference response was not JSON');
  }

  return parseLitellmChatContent(json);
}

/**
 * @param {Array<{ suiteId: string; suiteName?: string; failingProjects?: string[]; triageBody?: string }>} suites
 * @param {{ buildUrl?: string; totalSuites?: number }} [meta]
 * @returns {Promise<{ summary: string; modelId: string }>}
 */
async function summarizeWeeklyFailures(suites, meta = {}) {
  const modelId = resolveTriageModelId();
  if (!modelId) {
    throw new Error(
      'Triage model id could not be resolved (set EVAL_TRIAGE_MODEL_ID or provide LiteLLM connectors)'
    );
  }
  if (!modelId.startsWith('litellm-')) {
    throw new Error(`Unsupported model connector id for weekly triage: ${modelId}`);
  }

  const connectors = decodeAiConnectors();
  let connector = connectors[modelId];
  if (!connector) {
    connector = buildLitellmConnectorFromVault(modelId);
  }
  if (!connector) {
    throw new Error(
      `Model connector ${modelId} is not available (set KIBANA_TESTING_AI_CONNECTORS or LiteLLM env/config)`
    );
  }

  const messages = [
    {
      role: 'system',
      content:
        'You are an SRE assistant triaging a weekly batch of failed LLM evaluation CI runs. Be concise, factual, and actionable.',
    },
    { role: 'user', content: buildWeeklyRollupUserPrompt(suites, meta) },
  ];

  const request = buildLitellmChatRequest(connector, messages);
  let summary = await postForContent(request.url, request.headers, request.body);

  if (summary.length > maxOutputChars) {
    summary = `${summary.slice(0, maxOutputChars - 1)}…`;
  }

  return { summary: summary.trim(), modelId };
}

module.exports = { summarizeWeeklyFailures };
