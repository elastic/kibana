#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Reads KIBANA_TESTING_AI_CONNECTORS (base64 or raw JSON) and EVAL_MODEL_GROUPS
// from the environment, then writes matching connector IDs (newline-separated) to stdout.

const { parseMaybeBase64Json } = require('./ai_connectors');
const { slugifyId } = require('./slugify_id');

const cfg = parseMaybeBase64Json(process.env.KIBANA_TESTING_AI_CONNECTORS || '');

const requestedRaw = process.env.EVAL_MODEL_GROUPS || '';
const requested = requestedRaw
  ? requestedRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : [];

const connectorEntries = Object.entries(cfg);
const connectorIds =
  requested.length === 0 || requested.includes('all')
    ? connectorEntries.map(([id]) => id)
    : connectorEntries
        .filter(([id, connector]) => {
          // Old-shape `.gen-ai` defs (still accepted from locally-provided payloads).
          const defaultModel = connector?.config?.defaultModel;
          // Endpoint-shaped defs (EIS and OpenRouter) carry the model in providerConfig.
          const modelId = connector?.config?.providerConfig?.model_id;
          const isEis = connector?.config?.provider === 'elastic';

          const matchesRequested = (requestedValue) => {
            if (requestedValue === id) return true;
            if (typeof defaultModel === 'string' && requestedValue === defaultModel) return true;
            if (requestedValue.startsWith('openrouter/') && slugifyId(requestedValue) === id) {
              return true;
            }
            if (typeof modelId === 'string') {
              if (requestedValue === modelId) return true;
              if (
                isEis &&
                requestedValue.startsWith('eis/') &&
                requestedValue.slice('eis/'.length) === modelId
              ) {
                return true;
              }
            }
            return false;
          };

          return requested.some(matchesRequested);
        })
        .map(([id]) => id);

if (requested.length > 0 && !requested.includes('all') && connectorIds.length === 0) {
  const availableModels = connectorEntries.flatMap(([, connector]) => {
    const out = [];
    const defaultModel = connector?.config?.defaultModel;
    if (typeof defaultModel === 'string') out.push(defaultModel);
    const modelId = connector?.config?.providerConfig?.model_id;
    if (typeof modelId === 'string') {
      out.push(connector?.config?.provider === 'elastic' ? `eis/${modelId}` : modelId);
    }
    return out;
  });
  console.error(
    `No connectors matched EVAL_MODEL_GROUPS="${requested.join(',')}". ` +
      `Available models: ${availableModels.join(',')}`
  );
  process.exit(1);
}

process.stdout.write(connectorIds.join('\n'));
