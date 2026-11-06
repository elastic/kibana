/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Maps requested model groups (e.g. `eis/openai-gpt-5.4`, `openrouter/openai-gpt-5.4`, or a
// connector id) to the ids of the inference endpoint definitions in a
// `KIBANA_TESTING_INFERENCE_ENDPOINTS` map that satisfy them. Used by `get_fanout_matrix.js` to
// build the connector/per-spec fanout, keeping the matching rule in one place.

const { slugifyId } = require('./slugify_id');

const isEisEndpoint = (connector) => connector?.provider === 'elastic';

// Whether a single connector satisfies a single requested model group.
function connectorMatchesModelGroup(connectorId, connector, requestedValue) {
  if (requestedValue === connectorId) return true;

  if (requestedValue.startsWith('openrouter/') && slugifyId(requestedValue) === connectorId) {
    return true;
  }

  const modelId = connector?.providerConfig?.model_id;
  if (typeof modelId === 'string') {
    if (requestedValue === modelId) return true;
    if (
      isEisEndpoint(connector) &&
      requestedValue.startsWith('eis/') &&
      requestedValue.slice('eis/'.length) === modelId
    ) {
      return true;
    }
  }

  return false;
}

// Connector ids from `connectors` that satisfy any of `requestedModelGroups`. An empty request or
// `all` selects every connector (the "run every provisioned model" default).
function selectConnectorIds(connectors, requestedModelGroups) {
  const entries = Object.entries(connectors);
  if (requestedModelGroups.length === 0 || requestedModelGroups.includes('all')) {
    return entries.map(([id]) => id);
  }
  return entries
    .filter(([id, connector]) =>
      requestedModelGroups.some((requested) => connectorMatchesModelGroup(id, connector, requested))
    )
    .map(([id]) => id);
}

// Human-readable list of the models the connectors expose, for "nothing matched" diagnostics.
function describeAvailableModels(connectors) {
  return Object.values(connectors).flatMap((connector) => {
    const modelId = connector?.providerConfig?.model_id;
    if (typeof modelId !== 'string') return [];
    return [isEisEndpoint(connector) ? `eis/${modelId}` : modelId];
  });
}

// Parse a comma-separated `EVAL_MODEL_GROUPS` value into a trimmed, non-empty list.
function parseModelGroups(raw) {
  return raw
    ? String(raw)
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    : [];
}

module.exports = {
  connectorMatchesModelGroup,
  selectConnectorIds,
  describeAvailableModels,
  parseModelGroups,
};
