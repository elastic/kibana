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
  postLitellmChatRequest,
  decodeAiConnectors,
} = require('./failure_context_helpers');

const maxOutputChars = Number(process.env.EVAL_WEEKLY_SUMMARY_MAX_CHARS || '900');

/**
 * @param {Array<{ suiteId: string; suiteName?: string; failingProjects?: string[]; triageBody?: string }>} suites
 * @param {{ buildUrl?: string }} [meta]
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

  let summary = await postLitellmChatRequest(buildLitellmChatRequest(connector, messages));

  if (summary.length > maxOutputChars) {
    summary = `${summary.slice(0, maxOutputChars - 1)}…`;
  }

  return { summary: summary.trim(), modelId };
}

module.exports = { summarizeWeeklyFailures };
