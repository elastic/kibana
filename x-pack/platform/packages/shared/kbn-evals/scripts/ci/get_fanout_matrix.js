#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Builds the fanout matrix for `run_suite.sh`: one row per Buildkite step, written to stdout as
// `connectorId<TAB>shardId<TAB>specFiles` (spec files space-joined; shardId empty when unsharded).
//
// The single place per-spec model resolution lives. Two modes:
//   - Per-spec, when a suite declares `specs` with model overrides: each spec runs against its own
//     model list. Model config (`specs`) and CI batching (`shards`) are independent, and the spec
//     list is discovered from the suite directory, so this works with or without shards.
//   - Otherwise (explicit `models:<group>`, a grep override, or no `specs` overrides): every
//     requested connector runs every spec, batched by `shards` when present, else the whole suite.

const { readdirSync } = require('fs');
const Path = require('path');
const { fromRoot } = require('@kbn/repo-info');
const { parseMaybeBase64Json } = require('./ai_connectors');
const { selectConnectorIds, parseModelGroups } = require('./connector_matching');

const isTruthy = (value) => /^(1|true)$/i.test(String(value || '').trim());

// Spec files under a suite directory, as posix paths relative to it (same shape as
// `shards[].specFiles`). Returns [] if the dir is missing.
function discoverSpecFiles(suiteRootAbs) {
  const specFiles = [];
  const walk = (dirAbs) => {
    let entries;
    try {
      entries = readdirSync(dirAbs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const abs = Path.join(dirAbs, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
      } else if (entry.isFile() && entry.name.endsWith('.spec.ts')) {
        specFiles.push(Path.relative(suiteRootAbs, abs).split(Path.sep).join('/'));
      }
    }
  };
  walk(suiteRootAbs);
  return specFiles.sort();
}

// Whether a suite declares any per-spec model override. Only then does per-spec resolution change
// the fanout, so suites that never opted in keep the plain connector x shard fanout.
function hasSpecModelOverrides(specs) {
  return specs.some(
    (spec) =>
      Array.isArray(spec?.files) &&
      spec.files.length > 0 &&
      Array.isArray(spec?.models) &&
      spec.models.length > 0
  );
}

// The plain connector x shard fanout: every requested connector runs every spec file in each shard,
// or the whole suite (one step per connector) when there are no shards.
function buildConnectorShardMatrix({ connectors, shards, requestedModelGroups }) {
  const effectiveShards = shards.length === 0 ? [{ id: '', specFiles: [] }] : shards;
  const rows = [];
  for (const shard of effectiveShards) {
    const shardId = shard.id || '';
    const specFiles = Array.isArray(shard.specFiles) ? shard.specFiles : [];
    for (const connectorId of selectConnectorIds(connectors, requestedModelGroups)) {
      rows.push({ connectorId, shardId, specFiles });
    }
  }
  return rows;
}

/**
 * Resolve the fanout steps for a suite.
 *
 * @param {object} params
 * @param {object} params.connectors           parsed KIBANA_TESTING_AI_CONNECTORS map
 * @param {object} params.suiteInfo            get_suite_info.js output (shards, specs, weeklyEisModelGroups)
 * @param {string[]} params.requestedModelGroups  EVAL_MODEL_GROUPS (the provisioned universe)
 * @param {boolean} params.perSpec            EVAL_PER_SPEC_MODELS
 * @param {boolean} params.grepOverride       whether EVAL_GREP / EVAL_GREP_INVERT is set
 * @param {string[]} [params.specUniverse]    spec files discovered for the suite (relative paths);
 *                                            injected here so tests need not touch the filesystem
 * @param {(message: string) => void} [params.warn]  diagnostic sink (defaults to console.error)
 * @returns {Array<{connectorId: string, shardId: string, specFiles: string[]}>}
 */
function buildFanoutMatrix({
  connectors,
  suiteInfo,
  requestedModelGroups,
  perSpec: perSpecFlag,
  grepOverride,
  specUniverse = [],
  warn = (message) => console.error(message),
}) {
  const specs = Array.isArray(suiteInfo.specs) ? suiteInfo.specs : [];
  const suiteWeeklyModelGroups = Array.isArray(suiteInfo.weeklyEisModelGroups)
    ? suiteInfo.weeklyEisModelGroups
    : [];
  const configuredShards = Array.isArray(suiteInfo.shards) ? suiteInfo.shards : [];

  // A grep override always runs the whole suite unsharded (mirrors run_suite.sh), so it disables both.
  const perSpec = perSpecFlag && !grepOverride && hasSpecModelOverrides(specs);

  if (!perSpec) {
    const shards = grepOverride ? [] : configuredShards;
    return buildConnectorShardMatrix({ connectors, shards, requestedModelGroups });
  }

  // Model groups a spec runs against: its own `specs` override, else the suite fallback, else
  // whatever was requested (the provisioned universe).
  const modelsByFile = new Map();
  for (const spec of specs) {
    const files = Array.isArray(spec?.files) ? spec.files : [];
    const models = Array.isArray(spec?.models) ? spec.models : [];
    if (models.length === 0) {
      continue;
    }
    for (const file of files) {
      modelsByFile.set(file, models);
    }
  }

  // The shard (CI batch) a spec belongs to; a spec in no shard runs as its own unsharded step.
  const shardByFile = new Map();
  for (const shard of configuredShards) {
    const shardId = shard.id || '';
    for (const file of Array.isArray(shard.specFiles) ? shard.specFiles : []) {
      shardByFile.set(file, shardId);
    }
  }

  const resolveModels = (file) => {
    const own = modelsByFile.get(file);
    if (Array.isArray(own) && own.length > 0) {
      return own;
    }
    if (suiteWeeklyModelGroups.length > 0) {
      return suiteWeeklyModelGroups;
    }
    return requestedModelGroups;
  };

  // The specs to fan out: discovered files plus any shard-listed file (so a shard entry always runs).
  // Shards first, then the rest, so step order is stable.
  const orderedUniverse = [];
  const seen = new Set();
  const add = (file) => {
    if (file && !seen.has(file)) {
      seen.add(file);
      orderedUniverse.push(file);
    }
  };
  for (const shard of configuredShards) {
    for (const file of Array.isArray(shard.specFiles) ? shard.specFiles : []) {
      add(file);
    }
  }
  for (const file of specUniverse) {
    add(file);
  }

  // Group specs by (shard, connector): each step is one connector running the specs in one shard
  // that asked for it. Insertion order keeps spec order stable within a step.
  const stepsByKey = new Map();
  for (const file of orderedUniverse) {
    const groups = resolveModels(file);
    const connectorIds = selectConnectorIds(connectors, groups);
    if (connectorIds.length === 0) {
      warn(
        `No connector in KIBANA_TESTING_AI_CONNECTORS matched models [${groups.join(', ')}] ` +
          `for spec "${file}"; it will not run in this fanout.`
      );
      continue;
    }
    const shardId = shardByFile.get(file) || '';
    for (const connectorId of connectorIds) {
      const key = `${shardId}\u0000${connectorId}`;
      if (!stepsByKey.has(key)) {
        stepsByKey.set(key, { connectorId, shardId, specFiles: [] });
      }
      stepsByKey.get(key).specFiles.push(file);
    }
  }

  return [...stepsByKey.values()];
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

  // Spec files relative to the suite config directory, matching `shards[].specFiles`.
  const specUniverse = suiteInfo.configPath
    ? discoverSpecFiles(fromRoot(Path.dirname(suiteInfo.configPath)))
    : [];

  const rows = buildFanoutMatrix({
    connectors: parseMaybeBase64Json(process.env.KIBANA_TESTING_AI_CONNECTORS || ''),
    suiteInfo,
    requestedModelGroups: parseModelGroups(process.env.EVAL_MODEL_GROUPS || ''),
    perSpec: isTruthy(process.env.EVAL_PER_SPEC_MODELS),
    grepOverride: Boolean(
      (process.env.EVAL_GREP || '').trim() || (process.env.EVAL_GREP_INVERT || '').trim()
    ),
    specUniverse,
  });

  process.stdout.write(formatFanoutMatrix(rows));
}

if (require.main === module) {
  main();
}

module.exports = { buildFanoutMatrix, formatFanoutMatrix, discoverSpecFiles };
