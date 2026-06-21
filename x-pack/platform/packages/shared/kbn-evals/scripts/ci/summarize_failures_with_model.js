#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const {
  buildTriageUserPrompt,
  buildLitellmChatRequest,
  buildLitellmConnectorFromVault,
  resolveTriageModelId,
  postLitellmChatRequest,
  decodeAiConnectors,
} = require('./failure_context_helpers');

const maxOutputChars = Number(process.env.EVAL_TRIAGE_MAX_CHARS || '1500');

/**
 * @param {Record<string, unknown>} context
 * @returns {Promise<{ summary: string; modelId: string }>}
 */
async function summarizeFailuresWithModel(context) {
  const modelId = resolveTriageModelId();
  if (!modelId) {
    throw new Error(
      'Triage model id could not be resolved (set EVAL_TRIAGE_MODEL_ID or provide LiteLLM connectors)'
    );
  }

  const failingProjects = Array.isArray(context.failingProjects) ? context.failingProjects : [];

  const connectors = decodeAiConnectors();
  let connector = connectors[modelId];

  if (!connector && modelId.startsWith('litellm-')) {
    connector = buildLitellmConnectorFromVault(modelId);
  }

  if (!connector) {
    throw new Error(
      `Model connector ${modelId} is not available (set KIBANA_TESTING_AI_CONNECTORS or LiteLLM env/config)`
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

  if (!modelId.startsWith('litellm-')) {
    throw new Error(`Unsupported model connector id for triage: ${modelId}`);
  }

  let summary = await postLitellmChatRequest(buildLitellmChatRequest(connector, messages));

  if (summary.length > maxOutputChars) {
    summary = `${summary.slice(0, maxOutputChars - 1)}…`;
  }

  return { summary: summary.trim(), modelId };
}

module.exports = { summarizeFailuresWithModel };
