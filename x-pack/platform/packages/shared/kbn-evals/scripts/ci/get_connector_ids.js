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
const {
  selectConnectorIds,
  describeAvailableModels,
  parseModelGroups,
} = require('./connector_matching');

const cfg = parseMaybeBase64Json(process.env.KIBANA_TESTING_AI_CONNECTORS || '');

const requested = parseModelGroups(process.env.EVAL_MODEL_GROUPS || '');
const connectorIds = selectConnectorIds(cfg, requested);

if (requested.length > 0 && !requested.includes('all') && connectorIds.length === 0) {
  console.error(
    `No connectors matched EVAL_MODEL_GROUPS="${requested.join(',')}". ` +
      `Available models: ${describeAvailableModels(cfg).join(',')}`
  );
  process.exit(1);
}

process.stdout.write(connectorIds.join('\n'));
