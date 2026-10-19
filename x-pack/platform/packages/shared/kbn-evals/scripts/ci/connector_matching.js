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

// Keep in sync with `REASONING_EFFORT_LEVELS` in `src/utils/inference_endpoint_definition.ts`:
// these scripts run as plain Node in CI and cannot import the TypeScript sources. The variant id
// format (`<id>-effort-<level>`) is what `src/config/create_playwright_eval_config.ts` runs as a
// Playwright project, via the `reasoningEffort` the variant definition carries.
const REASONING_EFFORT_LEVELS = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'];

const VARIANT_ID_SUFFIX = new RegExp(`-effort-(${REASONING_EFFORT_LEVELS.join('|')})$`);

// `eis/<model>@high` -> `{ base: 'eis/<model>', reasoningEffort: 'high' }`.
function parseModelGroup(requestedValue) {
  const at = requestedValue.lastIndexOf('@');
  if (at === -1) {
    return { base: requestedValue, reasoningEffort: undefined };
  }
  const base = requestedValue.slice(0, at);
  const reasoningEffort = requestedValue.slice(at + 1);
  if (!REASONING_EFFORT_LEVELS.includes(reasoningEffort)) {
    throw new Error(
      `Unknown reasoning effort "${reasoningEffort}" in model group "${requestedValue}". ` +
        `Expected one of ${REASONING_EFFORT_LEVELS.join(', ')}.`
    );
  }
  return { base, reasoningEffort };
}

// `<baseId>-effort-<level>`: survives Buildkite step-key slugification, unlike `@`.
const buildReasoningEffortVariantId = (baseId, level) => `${baseId}-effort-${level}`;

// `eis-x-effort-high` -> `{ baseId: 'eis-x', reasoningEffort: 'high' }`; a plain id has no effort.
function splitReasoningEffortVariantId(connectorId) {
  const match = VARIANT_ID_SUFFIX.exec(connectorId);
  if (!match) {
    return { baseId: connectorId, reasoningEffort: undefined };
  }
  return { baseId: connectorId.slice(0, match.index), reasoningEffort: match[1] };
}

// Whether a connector id or its model satisfies a group with no effort in it.
function baseMatchesModelGroup(connectorId, connector, requestedValue) {
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

function connectorMatchesModelGroup(connectorId, connector, requestedValue) {
  const { base, reasoningEffort } = parseModelGroup(requestedValue);
  const connectorEffort = connector?.reasoningEffort;
  if (reasoningEffort === undefined) {
    return connectorEffort === undefined && baseMatchesModelGroup(connectorId, connector, base);
  }
  if (connectorEffort !== reasoningEffort) {
    return false;
  }
  const { baseId } = splitReasoningEffortVariantId(connectorId);
  return baseMatchesModelGroup(baseId, connector, base);
}

// Adds a `<id>-effort-<level>` copy of every connector a `<group>@<level>` request names, carrying
// `reasoningEffort`, so the fanout and the Playwright config see one project per effort.
function addReasoningEffortVariants(connectors, requestedModelGroups) {
  const result = { ...connectors };
  for (const group of requestedModelGroups) {
    const { base, reasoningEffort } = parseModelGroup(group);
    if (reasoningEffort === undefined) {
      continue;
    }
    for (const [connectorId, connector] of Object.entries(connectors)) {
      if (connector?.reasoningEffort !== undefined) {
        continue;
      }
      if (!baseMatchesModelGroup(connectorId, connector, base)) {
        continue;
      }
      const variantId = buildReasoningEffortVariantId(connectorId, reasoningEffort);
      if (!result[variantId]) {
        const name = typeof connector?.name === 'string' ? connector.name : connectorId;
        result[variantId] = { ...connector, name: `${name} (${reasoningEffort})`, reasoningEffort };
      }
    }
  }
  return result;
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
    const group = isEisEndpoint(connector) ? `eis/${modelId}` : modelId;
    return [connector.reasoningEffort ? `${group}@${connector.reasoningEffort}` : group];
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
  addReasoningEffortVariants,
  buildReasoningEffortVariantId,
  connectorMatchesModelGroup,
  describeAvailableModels,
  parseModelGroup,
  parseModelGroups,
  selectConnectorIds,
  splitReasoningEffortVariantId,
};
