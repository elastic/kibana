#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { readFileSync } = require('fs');
const {
  buildTriageUserPrompt,
  buildLitellmChatRequest,
  buildLitellmConnectorFromVault,
  resolveTriageJudgeId,
  resolveEisInferenceCredentials,
  buildEisChatRequest,
  parseEisStreamResponse,
  parseLitellmChatContent,
} = require('./failure_context_helpers');

const maxOutputChars = Number(process.env.EVAL_TRIAGE_MAX_CHARS || '1500');

/**
 * @returns {Record<string, { config?: Record<string, unknown>; secrets?: Record<string, unknown> }>}
 */
function decodeConnectors() {
  const b64 = process.env.KIBANA_TESTING_AI_CONNECTORS || '';
  if (!b64) {
    return {};
  }

  try {
    const parsed = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * @param {string} url
 * @param {Record<string, string>} headers
 * @param {Record<string, unknown>} body
 * @param {{ parseStream?: boolean }} [options]
 * @returns {Promise<string>}
 */
async function postForContent(url, headers, body, options = {}) {
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

  if (options.parseStream) {
    return parseEisStreamResponse(text);
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
 * @param {string} contextPath
 * @returns {Promise<{ summary: string; judgeId: string }>}
 */
async function summarizeFailuresWithJudge(contextPath) {
  const evaluationConnectorId = resolveTriageJudgeId();
  if (!evaluationConnectorId) {
    throw new Error(
      'Triage judge connector id could not be resolved (set EVAL_TRIAGE_JUDGE_ID or provide LiteLLM connectors)'
    );
  }

  const context = JSON.parse(readFileSync(contextPath, 'utf8'));
  const failingProjects = Array.isArray(context.failingProjects) ? context.failingProjects : [];

  const connectors = decodeConnectors();
  let connector = connectors[evaluationConnectorId];

  if (!connector && evaluationConnectorId.startsWith('litellm-')) {
    connector = buildLitellmConnectorFromVault(evaluationConnectorId);
  }

  if (!connector) {
    throw new Error(
      `Judge connector ${evaluationConnectorId} is not available (set KIBANA_TESTING_AI_CONNECTORS or LiteLLM env/config)`
    );
  }

  const userPrompt = buildTriageUserPrompt(context, {
    suiteName: String(context.suiteName || context.suiteId || ''),
    suiteId: String(context.suiteId || ''),
    buildUrl: typeof context.buildUrl === 'string' ? context.buildUrl : undefined,
    buildId: typeof context.buildId === 'string' ? context.buildId : undefined,
    failingProjects,
  });

  const messages = [
    {
      role: 'system',
      content:
        'You are an SRE assistant triaging failed LLM evaluation CI runs. Be concise, factual, and actionable.',
    },
    { role: 'user', content: userPrompt },
  ];

  let summary;
  if (evaluationConnectorId.startsWith('litellm-')) {
    const request = buildLitellmChatRequest(connector, messages);
    summary = await postForContent(request.url, request.headers, request.body);
  } else if (evaluationConnectorId.startsWith('eis-')) {
    const { esUrl, apiKey } = resolveEisInferenceCredentials();
    const request = buildEisChatRequest(connector, messages, esUrl, apiKey);
    summary = await postForContent(request.url, request.headers, request.body, {
      parseStream: true,
    });
  } else {
    throw new Error(`Unsupported judge connector id for triage: ${evaluationConnectorId}`);
  }

  if (summary.length > maxOutputChars) {
    summary = `${summary.slice(0, maxOutputChars - 1)}…`;
  }

  return { summary: summary.trim(), judgeId: evaluationConnectorId };
}

async function main() {
  const contextPath = process.argv[2] || process.env.EVAL_FAILURE_CONTEXT_PATH || '';
  if (!contextPath) {
    console.error('Usage: summarize_failures_with_judge.js <failure-context.json>');
    process.exit(1);
  }

  const { summary } = await summarizeFailuresWithJudge(contextPath);
  process.stdout.write(`${summary}\n`);
}

if (require.main === module) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Judge triage summary failed: ${message}`);
    process.exit(1);
  });
}

module.exports = { summarizeFailuresWithJudge };
