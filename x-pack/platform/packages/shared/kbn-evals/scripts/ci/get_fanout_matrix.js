#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Builds the connector/shard/spec fanout matrix for `run_suite.sh`. Reads the connectors
// (KIBANA_TESTING_AI_CONNECTORS), the suite info emitted by `get_suite_info.js` (EVAL_SUITE_INFO),
// the requested model groups (EVAL_MODEL_GROUPS) and the per-spec flag (EVAL_PER_SPEC_MODELS), then
// writes one row per Buildkite fanout step to stdout as `connectorId<TAB>shardId<TAB>specFiles`
// (spec files space-joined; shardId empty when the suite is not sharded).
//
// This is the single place per-spec model resolution lives. Two modes:
//   - Per-spec (weekly / `models:weekly-eis-models`): each spec runs against its own resolved model
//     list, so a connector only runs the specs in a shard that requested it.
//   - Override (explicit `models:<group>` / on-demand): every requested connector runs every spec,
//     the same fanout as before this existed.
// A manual EVAL_GREP / EVAL_GREP_INVERT override runs the whole suite unsharded, so it disables both
// sharding and per-spec resolution (mirrors run_suite.sh).

const { parseMaybeBase64Json } = require('./ai_connectors');
const { selectConnectorIds, parseModelGroups } = require('./connector_matching');
const { pathToSpecId } = require('./spec_id');

const isTruthy = (value) => /^(1|true)$/i.test(String(value || '').trim());

/**
 * Resolve the fanout steps for a suite.
 *
 * @param {object} params
 * @param {object} params.connectors           parsed KIBANA_TESTING_AI_CONNECTORS map
 * @param {object} params.suiteInfo            get_suite_info.js output (shards, specModelGroups, weeklyEisModelGroups)
 * @param {string[]} params.requestedModelGroups  EVAL_MODEL_GROUPS (the provisioned universe)
 * @param {boolean} params.perSpec            EVAL_PER_SPEC_MODELS
 * @param {boolean} params.grepOverride       whether EVAL_GREP / EVAL_GREP_INVERT is set
 * @returns {Array<{connectorId: string, shardId: string, specFiles: string[]}>}
 */
function buildFanoutMatrix({
  connectors,
  suiteInfo,
  requestedModelGroups,
  perSpec: perSpecFlag,
  grepOverride,
}) {
  const specModelGroups =
    suiteInfo.specModelGroups && typeof suiteInfo.specModelGroups === 'object'
      ? suiteInfo.specModelGroups
      : {};
  const suiteWeeklyModelGroups = Array.isArray(suiteInfo.weeklyEisModelGroups)
    ? suiteInfo.weeklyEisModelGroups
    : [];

  const configuredShards = Array.isArray(suiteInfo.shards) ? suiteInfo.shards : [];
  // A manual grep override, or a suite without shards, runs as one unsharded step per connector.
  const shards =
    grepOverride || configuredShards.length === 0 ? [{ id: '', specFiles: [] }] : configuredShards;

  // Model groups a spec runs against: its own override, else the suite fallback, else whatever was
  // requested (the provisioned universe). Empty lists are treated as "not set" so they fall through.
  const resolveSpecModelGroups = (specId) => {
    const own = specModelGroups[specId];
    if (Array.isArray(own) && own.length > 0) {
      return own;
    }
    if (suiteWeeklyModelGroups.length > 0) {
      return suiteWeeklyModelGroups;
    }
    return requestedModelGroups;
  };

  const rows = [];

  for (const shard of shards) {
    const shardId = shard.id || '';
    const specFiles = Array.isArray(shard.specFiles) ? shard.specFiles : [];
    const perSpec = perSpecFlag && !grepOverride && specFiles.length > 0;

    if (!perSpec) {
      // Every requested connector runs every spec file in the shard (or the whole suite when
      // specFiles is empty). This is the pre-existing connector x shard fanout.
      for (const connectorId of selectConnectorIds(connectors, requestedModelGroups)) {
        rows.push({ connectorId, shardId, specFiles });
      }
      continue;
    }

    // Group the shard's specs by the connectors they resolve to, so a connector only runs the specs
    // that asked for it. Insertion order keeps spec order stable within each step.
    const connectorToSpecFiles = new Map();
    for (const specFile of specFiles) {
      const groups = resolveSpecModelGroups(pathToSpecId(specFile));
      for (const connectorId of selectConnectorIds(connectors, groups)) {
        if (!connectorToSpecFiles.has(connectorId)) {
          connectorToSpecFiles.set(connectorId, []);
        }
        connectorToSpecFiles.get(connectorId).push(specFile);
      }
    }

    for (const [connectorId, connectorSpecFiles] of connectorToSpecFiles) {
      rows.push({ connectorId, shardId, specFiles: connectorSpecFiles });
    }
  }

  return rows;
}

// Serialize to the tab-separated rows `run_suite.sh` reads with `IFS=$'\t'`.
function formatFanoutMatrix(rows) {
  return rows
    .map(({ connectorId, shardId, specFiles }) =>
      [connectorId, shardId, specFiles.join(' ')].join('\t')
    )
    .join('\n');
}

function main() {
  let suiteInfo = {};
  try {
    const parsed = JSON.parse(process.env.EVAL_SUITE_INFO || '{}');
    if (parsed && typeof parsed === 'object') {
      suiteInfo = parsed;
    }
  } catch {
    // Leave suiteInfo empty; the suite then behaves as unsharded (one step per connector).
  }

  const rows = buildFanoutMatrix({
    connectors: parseMaybeBase64Json(process.env.KIBANA_TESTING_AI_CONNECTORS || ''),
    suiteInfo,
    requestedModelGroups: parseModelGroups(process.env.EVAL_MODEL_GROUPS || ''),
    perSpec: isTruthy(process.env.EVAL_PER_SPEC_MODELS),
    grepOverride: Boolean(
      (process.env.EVAL_GREP || '').trim() || (process.env.EVAL_GREP_INVERT || '').trim()
    ),
  });

  process.stdout.write(formatFanoutMatrix(rows));
}

if (require.main === module) {
  main();
}

module.exports = { buildFanoutMatrix, formatFanoutMatrix };
