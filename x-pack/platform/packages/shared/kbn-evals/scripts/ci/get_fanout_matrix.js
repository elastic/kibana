#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Builds the fanout matrix for `run_suite.sh`: one row per Buildkite step, written to stdout as
// `connectorId<TAB>shardId<TAB>specFiles` (spec files space-joined). Empty shard id is written as
// `-` so bash `IFS=$'\t'` does not collapse the field.
//
// Weekly (`KBN_EVALS_WEEKLY`) + `specs[]` with models: for each shard (or one virtual batch of
// `specs[].files` when there are no shards), each connector matching EVAL_MODEL_GROUPS gets only
// the spec files in that batch that listed it. A spec in a shard with no `specs[]` entry keeps the
// full weekly list. `specs[]` and `shards[]` stay independent: models vs CI batching.
//
// Otherwise (PR, on-demand, grep, or no `specs` overrides): every requested connector runs every
// spec, batched by `shards` when present, else the whole suite.

const { parseMaybeBase64Json } = require('./ai_connectors');
const {
  connectorMatchesModelGroup,
  describeAvailableModels,
  parseModelGroups,
  selectConnectorIds,
} = require('./connector_matching');

const isTruthy = (value) => /^(1|true)$/i.test(String(value || '').trim());

// Placeholder so an unsharded TSV row is `connector\t-\tspecs`, not `connector\t\tspecs`.
const EMPTY_SHARD_ID = '-';

const hasSpecModelOverrides = (specs) =>
  specs.some(
    (spec) =>
      Array.isArray(spec?.files) &&
      spec.files.length > 0 &&
      Array.isArray(spec?.models) &&
      spec.models.length > 0
  );

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

const modelsByFileFromSpecs = (specs) => {
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
  return modelsByFile;
};

const modelsForFile = (file, modelsByFile, suiteWeeklyModelGroups, requestedModelGroups) => {
  const own = modelsByFile.get(file);
  if (Array.isArray(own) && own.length > 0) {
    return own;
  }
  if (suiteWeeklyModelGroups.length > 0) {
    return suiteWeeklyModelGroups;
  }
  return requestedModelGroups;
};

const assertListedModelsHaveConnectors = (connectors, groups) => {
  for (const group of groups) {
    if (group === 'all') {
      continue;
    }
    if (selectConnectorIds(connectors, [group]).length === 0) {
      throw new Error(
        `No connector in KIBANA_TESTING_AI_CONNECTORS matched model "${group}". ` +
          `Available models: ${describeAvailableModels(connectors).join(',')}`
      );
    }
  }
};

// Connector x shard: every requested connector runs every spec file in each shard, or the whole
// suite (one step per connector, empty specFiles) when there are no shards.
function buildConnectorShardMatrix({ connectors, shards, requestedModelGroups }) {
  const connectorIds = assertRequestedConnectors(connectors, requestedModelGroups);
  const effectiveShards = shards.length === 0 ? [{ id: '', specFiles: [] }] : shards;
  const rows = [];
  for (const shard of effectiveShards) {
    const shardId = shard.id || '';
    const specFiles = Array.isArray(shard.specFiles) ? shard.specFiles : [];
    for (const connectorId of connectorIds) {
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
 * @param {boolean} params.perSpec            weekly run (`KBN_EVALS_WEEKLY`); apply `specs` overrides
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
  const specs = Array.isArray(suiteInfo.specs) ? suiteInfo.specs : [];
  const suiteWeeklyModelGroups = Array.isArray(suiteInfo.weeklyEisModelGroups)
    ? suiteInfo.weeklyEisModelGroups
    : [];
  const configuredShards = Array.isArray(suiteInfo.shards) ? suiteInfo.shards : [];

  const perSpec = perSpecFlag && !grepOverride && hasSpecModelOverrides(specs);

  if (!perSpec) {
    const shards = grepOverride ? [] : configuredShards;
    return buildConnectorShardMatrix({ connectors, shards, requestedModelGroups });
  }

  const connectorIds = assertRequestedConnectors(connectors, requestedModelGroups);
  const modelsByFile = modelsByFileFromSpecs(specs);
  const batches =
    configuredShards.length > 0
      ? configuredShards
      : [
          {
            id: '',
            specFiles: specs.flatMap((spec) =>
              Array.isArray(spec?.files) && Array.isArray(spec?.models) && spec.models.length > 0
                ? spec.files
                : []
            ),
          },
        ];

  const usedModelGroups = new Set();
  for (const batch of batches) {
    for (const file of Array.isArray(batch.specFiles) ? batch.specFiles : []) {
      for (const group of modelsForFile(
        file,
        modelsByFile,
        suiteWeeklyModelGroups,
        requestedModelGroups
      )) {
        usedModelGroups.add(group);
      }
    }
  }
  assertListedModelsHaveConnectors(connectors, [...usedModelGroups]);

  const rows = [];
  for (const batch of batches) {
    const shardId = batch.id || '';
    const batchFiles = Array.isArray(batch.specFiles) ? batch.specFiles : [];
    for (const connectorId of connectorIds) {
      const connector = connectors[connectorId];
      const specFiles = batchFiles.filter((file) => {
        const groups = modelsForFile(
          file,
          modelsByFile,
          suiteWeeklyModelGroups,
          requestedModelGroups
        );
        return groups.some((group) => connectorMatchesModelGroup(connectorId, connector, group));
      });
      if (specFiles.length > 0) {
        rows.push({ connectorId, shardId, specFiles });
      }
    }
  }
  return rows;
}

function formatFanoutMatrix(rows) {
  return rows
    .map(({ connectorId, shardId, specFiles }) =>
      [connectorId, shardId || EMPTY_SHARD_ID, specFiles.join(' ')].join('\t')
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
      connectors: parseMaybeBase64Json(process.env.KIBANA_TESTING_AI_CONNECTORS || ''),
      suiteInfo,
      requestedModelGroups: parseModelGroups(process.env.EVAL_MODEL_GROUPS || ''),
      perSpec: isTruthy(process.env.KBN_EVALS_WEEKLY),
      grepOverride: Boolean(
        (process.env.EVAL_GREP || '').trim() || (process.env.EVAL_GREP_INVERT || '').trim()
      ),
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

module.exports = { buildFanoutMatrix, formatFanoutMatrix, EMPTY_SHARD_ID };
