/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface NormalizeExecuteConnectorSubActionArgsOptions {
  /**
   * When the conversation has exactly one connector attachment, callers may pass
   * its saved-object id so a missing `connectorId` can be filled after alias/hoist.
   * Never overrides an existing non-empty `connectorId`.
   */
  loneConnectorId?: string;
}

const RESERVED_ROOT_KEYS = new Set([
  '_reasoning',
  'connectorId',
  'subAction',
  'params',
  'connector_id',
  'sub_action',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/** Maps `connector_id` / `sub_action` to camelCase; prefers existing camel keys over snake_case. */
function aliasConnectorSnakeCaseFields(record: Record<string, unknown>) {
  if ('connector_id' in record && 'connectorId' in record) {
    delete record.connector_id;
  }
  if ('sub_action' in record && 'subAction' in record) {
    delete record.sub_action;
  }
  if ('connector_id' in record && !('connectorId' in record)) {
    record.connectorId = record.connector_id;
    delete record.connector_id;
  }
  if ('sub_action' in record && !('subAction' in record)) {
    record.subAction = record.sub_action;
    delete record.sub_action;
  }
}

/**
 * Structural normalization for `platform.core.execute_connector_sub_action` tool arguments.
 *
 * Does **not** mutate `input`. Applies, in order:
 * - Root aliases: `connector_id` → `connectorId`, `sub_action` → `subAction` (camelCase wins if both).
 * - Hoist: `connectorId` / `subAction` wrongly nested under `params` move to the root; root wins on collision.
 * - Flatten: every other top-level key (except reserved roots) merges into `params` (top-level overwrites same key in `params`).
 * - Lone id: sets `connectorId` from {@link NormalizeExecuteConnectorSubActionArgsOptions.loneConnectorId} only when still missing after the steps above.
 *
 * Non-plain-object `input` (e.g. `null`, array, primitive) is returned unchanged.
 *
 * @remarks Does **not** infer `subAction` from parameter shapes or payload heuristics.
 *
 * @param input - Raw tool arguments from the model or API.
 * @param options - Optional `loneConnectorId` when chat context has a single connector attachment.
 * @returns Normalized plain object suitable for Zod parsing, or the original `input` when not a plain object.
 */
export function normalizeExecuteConnectorSubActionArgs(
  input: unknown,
  options: NormalizeExecuteConnectorSubActionArgsOptions
): unknown {
  if (!isPlainObject(input)) {
    return input;
  }

  const src: Record<string, unknown> = { ...input };
  aliasConnectorSnakeCaseFields(src);

  let paramsObj: Record<string, unknown>;
  if (isPlainObject(src.params)) {
    paramsObj = { ...src.params };
  } else {
    paramsObj = {};
  }

  aliasConnectorSnakeCaseFields(paramsObj);

  if (!isNonEmptyString(src.connectorId)) {
    if (isNonEmptyString(paramsObj.connectorId)) {
      src.connectorId = paramsObj.connectorId;
    }
  }
  delete paramsObj.connectorId;
  delete paramsObj.connector_id;

  if (!isNonEmptyString(src.subAction)) {
    if (isNonEmptyString(paramsObj.subAction)) {
      src.subAction = paramsObj.subAction;
    }
  }
  delete paramsObj.subAction;
  delete paramsObj.sub_action;

  const mergedParams: Record<string, unknown> = { ...paramsObj };
  for (const [key, value] of Object.entries(src)) {
    if (RESERVED_ROOT_KEYS.has(key)) {
      continue;
    }
    mergedParams[key] = value;
  }

  const out: Record<string, unknown> = {};
  if ('_reasoning' in src) {
    out._reasoning = src._reasoning;
  }
  if (isNonEmptyString(src.connectorId)) {
    out.connectorId = src.connectorId;
  }
  if (isNonEmptyString(src.subAction)) {
    out.subAction = src.subAction;
  }
  if (Object.keys(mergedParams).length > 0) {
    out.params = mergedParams;
  }

  if (!isNonEmptyString(out.connectorId) && isNonEmptyString(options.loneConnectorId)) {
    out.connectorId = options.loneConnectorId;
  }

  return out;
}
