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
  parseLitellmChatContent,
} = require('./failure_context_helpers');

const contextPath = process.argv[2] || process.env.EVAL_FAILURE_CONTEXT_PATH || '';
const maxOutputChars = Number(process.env.EVAL_TRIAGE_MAX_CHARS || '1500');

if (!contextPath) {
  console.error('Usage: summarize_failures_with_judge.js <failure-context.json>');
  process.exit(1);
}

const evaluationConnectorId = process.env.EVALUATION_CONNECTOR_ID || '';
if (!evaluationConnectorId) {
  console.error('EVALUATION_CONNECTOR_ID is required for judge triage summary');
  process.exit(0);
}

/**
 * @returns {Record<string, { config?: Record<string, unknown>; secrets?: Record<string, unknown> }>}
 */
function decodeConnectors() {
  const b64 = process.env.KIBANA_TESTING_AI_CONNECTORS || '';
  if (!b64) {
    throw new Error('KIBANA_TESTING_AI_CONNECTORS is not set');
  }

  const parsed = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Failed to parse KIBANA_TESTING_AI_CONNECTORS');
  }

  return parsed;
}

/**
 * @param {string} url
 * @param {Record<string, string>} headers
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
async function postJson(url, headers, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // keep null
  }

  if (!response.ok) {
    const detail =
      json && typeof json === 'object' && 'error' in json
        ? JSON.stringify(json.error)
        : text.slice(0, 500);
    throw new Error(`LiteLLM request failed (${response.status}): ${detail}`);
  }

  return json;
}

async function main() {
  if (evaluationConnectorId.startsWith('eis-')) {
    console.error(
      `Skipping judge triage summary: EIS judge (${evaluationConnectorId}) is not supported in suite_owner_notify yet`
    );
    process.exit(0);
  }

  if (!evaluationConnectorId.startsWith('litellm-')) {
    console.error(
      `Skipping judge triage summary: unsupported judge connector id ${evaluationConnectorId}`
    );
    process.exit(0);
  }

  const context = JSON.parse(readFileSync(contextPath, 'utf8'));
  const failingProjects = Array.isArray(context.failingProjects) ? context.failingProjects : [];

  const connectors = decodeConnectors();
  const connector = connectors[evaluationConnectorId];
  if (!connector) {
    throw new Error(
      `Judge connector ${evaluationConnectorId} not found in KIBANA_TESTING_AI_CONNECTORS`
    );
  }

  const userPrompt = buildTriageUserPrompt(context, {
    suiteName: String(context.suiteName || context.suiteId || ''),
    suiteId: String(context.suiteId || ''),
    buildUrl: typeof context.buildUrl === 'string' ? context.buildUrl : undefined,
    buildId: typeof context.buildId === 'string' ? context.buildId : undefined,
    failingProjects,
  });

  const request = buildLitellmChatRequest(connector, [
    {
      role: 'system',
      content:
        'You are an SRE assistant triaging failed LLM evaluation CI runs. Be concise, factual, and actionable.',
    },
    { role: 'user', content: userPrompt },
  ]);

  const responseJson = await postJson(request.url, request.headers, request.body);
  let summary = parseLitellmChatContent(responseJson);

  if (summary.length > maxOutputChars) {
    summary = `${summary.slice(0, maxOutputChars - 1)}…`;
  }

  process.stdout.write(`${summary}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Judge triage summary failed: ${message}`);
  process.exit(0);
});
