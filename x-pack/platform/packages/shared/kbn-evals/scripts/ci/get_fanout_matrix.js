#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Builds the fanout matrix for `run_suite.sh`: one JSON object per line (JSONL) on stdout, each
// `{ connectorId, shardId, specFiles }` (`specFiles` is an array), plus `judge` when the shard pins
// its evaluation connector. `run_suite.sh` reads the fields with `jq`, so there is no positional/tab
// parsing that could mangle an empty shard id.
//
// Weekly (`KBN_EVALS_WEEKLY`) + `specModelGroups[]` with models: for each shard (or one virtual
// batch of `specModelGroups[].files` when there are no shards), each connector matching
// EVAL_MODEL_GROUPS gets only the spec files in that batch that listed it. A spec in a shard with no
// `specModelGroups[]` entry keeps the full weekly list. `specModelGroups[]` and `shards[]` stay
// independent: models vs CI batching.
//
// Otherwise (PR, on-demand, grep, or no `specModelGroups` overrides): every requested connector runs
// every spec, batched by `shards` when present, else the whole suite.
//
// `EVAL_SHARD_IDS` (comma-separated) runs only the named shards. Without it, shards marked `optIn`
// are skipped, so a pipeline that names them (e.g. the daily one) can add shards the weekly, PR and
// on-demand runs never pick up.

const { parseMaybeBase64Json } = require('./ai_connectors');
const {
  connectorMatchesModelGroup,
  describeAvailableModels,
  parseModelGroups,
  selectConnectorIds,
} = require('./connector_matching');

const isTruthy = (value) => /^(1|true)$/i.test(String(value || '').trim());

const noConnectorMatchError = (groups, connectors) =>
  new Error(
    `No connectors matched EVAL_MODEL_GROUPS="${groups.join(',')}". ` +
      `Available models: ${describeAvailableModels(connectors).join(',')}`
  );

const assertRequestedConnectors = (connectors, requestedModelGroups) => {
  const connectorIds = selectConnectorIds(connectors, requestedModelGroups);
  if (
    requestedModelGroups.length > 0 &&
    !requestedModelGroups.includes('all') &&
    connectorIds.length === 0
  ) {
    throw noConnectorMatchError(requestedModelGroups, connectors);
  }
  return connectorIds;
};

// `specModelGroups[].files` -> `models`, for entries that set a non-empty model list.
const modelsByFileFromSpecs = (specModelGroups) => {
  const modelsByFile = new Map();
  for (const spec of specModelGroups) {
    const files = Array.isArray(spec?.files) ? spec.files : [];
    const models = Array.isArray(spec?.models) ? spec.models : [];
    if (models.length === 0) {
      continue;
    }
    for (const file of files) {
      modelsByFile.set(file, models);
    }
  }
  return modelsByFile;
};

// Resolve every batch file's model list once: its own `specModelGroups` entry, else `fallback`
// (the suite weekly list, or the requested universe when the suite has none).
const resolveBatchModels = (batches, overrides, fallback) => {
  const modelsByFile = new Map();
  for (const batch of batches) {
    for (const file of Array.isArray(batch.specFiles) ? batch.specFiles : []) {
      modelsByFile.set(file, overrides.get(file) ?? fallback);
    }
  }
  return modelsByFile;
};

const assertListedModelsHaveConnectors = (connectors, groups) => {
  for (const group of groups) {
    if (group === 'all') {
      continue;
    }
    if (selectConnectorIds(connectors, [group]).length === 0) {
      throw new Error(
        `No connector in KIBANA_TESTING_INFERENCE_ENDPOINTS matched model "${group}". ` +
          `Available models: ${describeAvailableModels(connectors).join(',')}`
      );
    }
  }
};

const parseShardIds = (value) => [
  ...new Set(
    String(value || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
  ),
];

// The shards a run uses: the requested ones, else every shard that is not `optIn`. Unknown ids
// throw rather than silently running fewer shards than asked for.
const selectShards = (shards, requestedShardIds) => {
  if (requestedShardIds.length === 0) {
    const eligibleShards = shards.filter((shard) => shard?.optIn !== true);
    // No shards means a whole-suite run, which would include the opt-in specs.
    if (shards.length > 0 && eligibleShards.length === 0) {
      throw new Error(
        'Every shard of this suite is optIn; name the shards to run in EVAL_SHARD_IDS'
      );
    }
    return eligibleShards;
  }
  const availableIds = shards.map((shard) => shard?.id);
  const unknownIds = requestedShardIds.filter((id) => !availableIds.includes(id));
  if (unknownIds.length > 0) {
    throw new Error(
      `Unknown shard id(s) in EVAL_SHARD_IDS: ${unknownIds.join(',')}. ` +
        `Available: ${availableIds.join(',') || '<none, the suite has no shards>'}`
    );
  }
  return shards.filter((shard) => requestedShardIds.includes(shard.id));
};

// A shard's `judge` pins the evaluation connector of its steps; otherwise the suite-wide judge applies.
const shardJudge = (shard) => (typeof shard?.judge === 'string' ? shard.judge.trim() : '');

// Connector x shard: every requested connector runs every spec file in each shard, or the whole
// suite (one step per connector, empty specFiles) when there are no shards.
function buildConnectorShardMatrix({ connectors, shards, requestedModelGroups }) {
  const connectorIds = assertRequestedConnectors(connectors, requestedModelGroups);
  const effectiveShards = shards.length === 0 ? [{ id: '', specFiles: [] }] : shards;
  const rows = [];
  for (const shard of effectiveShards) {
    const shardId = shard.id || '';
    const specFiles = Array.isArray(shard.specFiles) ? shard.specFiles : [];
    const judge = shardJudge(shard);
    for (const connectorId of connectorIds) {
      rows.push({ connectorId, shardId, specFiles, ...(judge ? { judge } : {}) });
    }
  }
  return rows;
}

/**
 * Resolve the fanout steps for a suite.
 *
 * @param {object} params
 * @param {object} params.connectors           parsed KIBANA_TESTING_INFERENCE_ENDPOINTS map
 * @param {object} params.suiteInfo            get_suite_info.js output (shards, specModelGroups, weeklyEisModelGroups)
 * @param {string[]} params.requestedModelGroups  EVAL_MODEL_GROUPS (the provisioned universe)
 * @param {boolean} params.perSpec            weekly run (`KBN_EVALS_WEEKLY`); apply `specModelGroups` overrides
 * @param {boolean} params.grepOverride       whether EVAL_GREP / EVAL_GREP_INVERT is set
 * @param {string[]} [params.requestedShardIds] EVAL_SHARD_IDS; empty runs every shard that is not `optIn`
 * @returns {Array<{connectorId: string, shardId: string, specFiles: string[], judge?: string}>}
 */
function buildFanoutMatrix({
  connectors,
  suiteInfo,
  requestedModelGroups,
  perSpec: perSpecFlag,
  grepOverride,
  requestedShardIds = [],
}) {
  // A grep run is one whole-suite step with no shard, so the requested shards would never run.
  if (grepOverride && requestedShardIds.length > 0) {
    throw new Error(
      'EVAL_SHARD_IDS cannot be combined with EVAL_GREP / EVAL_GREP_INVERT: a grep run ignores shards'
    );
  }
  const specModelGroups = Array.isArray(suiteInfo.specModelGroups) ? suiteInfo.specModelGroups : [];
  const suiteWeeklyModelGroups = Array.isArray(suiteInfo.weeklyEisModelGroups)
    ? suiteInfo.weeklyEisModelGroups
    : [];
  // A grep run is one whole-suite step filtered by the pattern, so it uses no shard.
  const configuredShards = grepOverride
    ? []
    : selectShards(Array.isArray(suiteInfo.shards) ? suiteInfo.shards : [], requestedShardIds);

  const overrides = modelsByFileFromSpecs(specModelGroups);
  const perSpec = perSpecFlag && !grepOverride && overrides.size > 0;

  if (!perSpec) {
    return buildConnectorShardMatrix({
      connectors,
      shards: configuredShards,
      requestedModelGroups,
    });
  }

  const connectorIds = assertRequestedConnectors(connectors, requestedModelGroups);
  const batches =
    configuredShards.length > 0
      ? configuredShards
      : [
          {
            id: '',
            specFiles: specModelGroups.flatMap((spec) =>
              Array.isArray(spec?.files) ? spec.files : []
            ),
          },
        ];

  const modelsByFile = resolveBatchModels(
    batches,
    overrides,
    suiteWeeklyModelGroups.length > 0 ? suiteWeeklyModelGroups : requestedModelGroups
  );
  assertListedModelsHaveConnectors(connectors, [...new Set([...modelsByFile.values()].flat())]);

  const rows = [];
  for (const batch of batches) {
    const shardId = batch.id || '';
    const batchFiles = Array.isArray(batch.specFiles) ? batch.specFiles : [];
    const judge = shardJudge(batch);
    for (const connectorId of connectorIds) {
      const connector = connectors[connectorId];
      const specFiles = batchFiles.filter((file) =>
        modelsByFile
          .get(file)
          .some((group) => connectorMatchesModelGroup(connectorId, connector, group))
      );
      if (specFiles.length > 0) {
        rows.push({ connectorId, shardId, specFiles, ...(judge ? { judge } : {}) });
      }
    }
  }
  // An empty matrix would make run_suite.sh take its "nothing provisioned" fallback and run the
  // whole suite on the judge connector, which is never what a per-spec run asked for.
  if (rows.length === 0) {
    throw new Error(
      `Per-spec resolution produced no steps for EVAL_MODEL_GROUPS="${requestedModelGroups.join(
        ','
      )}": no spec in evals.suites.json lists any of the requested models`
    );
  }
  return rows;
}

// One JSON object per line (JSONL). `run_suite.sh` reads each field with `jq`, so an empty shardId
// or specFiles array round-trips unambiguously (no tab collapsing).
function formatFanoutMatrix(rows) {
  return rows
    .map(({ connectorId, shardId, specFiles, judge }) =>
      JSON.stringify({
        connectorId,
        shardId: shardId || '',
        specFiles,
        ...(judge ? { judge } : {}),
      })
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

  try {
    const rows = buildFanoutMatrix({
      connectors: parseMaybeBase64Json(process.env.KIBANA_TESTING_INFERENCE_ENDPOINTS || ''),
      suiteInfo,
      requestedModelGroups: parseModelGroups(process.env.EVAL_MODEL_GROUPS || ''),
      perSpec: isTruthy(process.env.KBN_EVALS_WEEKLY),
      grepOverride: Boolean(
        (process.env.EVAL_GREP || '').trim() || (process.env.EVAL_GREP_INVERT || '').trim()
      ),
      requestedShardIds: parseShardIds(process.env.EVAL_SHARD_IDS),
    });
    process.stdout.write(formatFanoutMatrix(rows));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { buildFanoutMatrix, formatFanoutMatrix, parseShardIds };
