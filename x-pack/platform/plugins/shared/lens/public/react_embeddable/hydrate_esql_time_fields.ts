/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isOfAggregateQueryType } from '@kbn/es-query';
import { getESQLTimeFieldFromQuery, getQuerySummary } from '@kbn/esql-utils';
import { isAssignment, singleItems, Walker } from '@elastic/esql';
import type { LensRuntimeState, TextBasedPersistedState } from '@kbn/lens-common';
import type { ESQLStartServices } from './esql';

/**
 * Hydrates ES|QL text-based layers and their ad-hoc DataView specs with time
 * field information that is not part of the persisted state.
 *
 * The Lens-as-code / API surface does not include a `timeFieldName` definition
 * — for ES|QL visualizations the time field must be derived at runtime from the
 * query and the underlying data (via the TIMEFIELD_ROUTE HTTP endpoint). This
 * function performs that detection and patches three things:
 *
 * 1. `layer.timeField` — so downstream expression building applies time-based
 *    filtering correctly.
 * 2. `adHocDataViews[id].timeFieldName` — so every `dataViews.create(spec)`
 *    call produces a DataView instance with the correct time field, preventing
 *    the DataViewsService cache from being polluted with a stale, time-field-less
 *    instance.
 * 3. Time-field-derived columns (`meta.type` → `'date'`) — columns that
 *    directly reference the time field (including renamed references like
 *    `ts = @timestamp`) or are produced by BUCKET / TBUCKET / DATE_TRUNC on
 *    the time field are tagged as date type.
 *
 * This runs once during `deserializeState` — the earliest async entry point for
 * the embeddable — before any downstream consumer (`getUsedDataViews`,
 * `persistedStateToExpression`, etc.) can touch the DataViewsService cache.
 *
 * If the time-field HTTP request fails (for example a transient network error),
 * that layer is left unchanged rather than rejecting deserialization.
 */
export async function hydrateESQLTimeFields(
  attributes: LensRuntimeState['attributes'],
  http: ESQLStartServices['coreStart']['http']
): Promise<LensRuntimeState['attributes']> {
  const textBasedState = attributes.state?.datasourceStates?.textBased as
    | TextBasedPersistedState
    | undefined;
  if (!textBasedState?.layers) {
    return attributes;
  }

  const adHocDataViews = { ...(attributes.state.adHocDataViews ?? {}) };
  const layers = { ...textBasedState.layers };
  let changed = false;

  for (const [layerId, layer] of Object.entries(layers)) {
    if (!layer.query || !isOfAggregateQueryType(layer.query)) {
      continue;
    }

    let timeFieldName = layer.timeField;
    if (!timeFieldName) {
      try {
        timeFieldName =
          (await getESQLTimeFieldFromQuery({ query: layer.query.esql, http })) ?? undefined;
      } catch {
        // Network or server errors during time-field detection should not fail
        // deserialization; continue without runtime hydration for this layer.
      }
    }

    if (!timeFieldName) {
      continue;
    }

    const temporalColumns = getTimeFieldDerivedColumns(layer.query.esql, timeFieldName);
    const columns =
      temporalColumns.size > 0
        ? layer.columns.map((c) =>
            c.fieldName && temporalColumns.has(c.fieldName) && c.meta?.type !== 'date'
              ? { ...c, meta: { ...c.meta, type: 'date' as const } }
              : c
          )
        : layer.columns;

    if (layer.timeField !== timeFieldName || columns !== layer.columns) {
      layers[layerId] = { ...layer, timeField: timeFieldName, columns };
      changed = true;
    }

    if (layer.index && adHocDataViews[layer.index] && !adHocDataViews[layer.index].timeFieldName) {
      adHocDataViews[layer.index] = { ...adHocDataViews[layer.index], timeFieldName };
      changed = true;
    }
  }

  if (!changed) {
    return attributes;
  }

  return {
    ...attributes,
    state: {
      ...attributes.state,
      datasourceStates: {
        ...attributes.state.datasourceStates,
        textBased: { ...textBasedState, layers },
      },
      adHocDataViews,
    },
  };
}

const TEMPORAL_GROUPING_FUNCTIONS = new Set(['bucket', 'tbucket', 'date_trunc']);

/**
 * Given an ES|QL query and its detected timeFieldName, returns the set of
 * output column names that are time-field-derived. This includes:
 *
 * - Direct references to the time field (e.g. `... BY @timestamp`).
 * - Renamed references (e.g. `... BY ts = @timestamp`).
 * - Temporal grouping functions — BUCKET, TBUCKET, or DATE_TRUNC — applied
 *   to the time field (e.g. `... BY bucket(@timestamp, 1 day)`).
 *
 * Returns an empty set when the query contains no such columns.
 */
function getTimeFieldDerivedColumns(esqlQuery: string, timeFieldName: string): Set<string> {
  const result = new Set<string>();
  try {
    const { grouping } = getQuerySummary(esqlQuery);
    if (!grouping) return result;

    for (const { field, arg } of grouping) {
      if (field === timeFieldName) {
        result.add(field);
        continue;
      }

      const def = isAssignment(arg) ? [...singleItems(arg.args)][1] : arg;
      if (!def) continue;

      if (def.type === 'column' && def.name === timeFieldName) {
        result.add(field);
        continue;
      }

      if (def.type !== 'function') continue;

      const funcName = def.name.toLowerCase();
      if (funcName === '=') continue;

      if (!TEMPORAL_GROUPING_FUNCTIONS.has(funcName)) continue;

      let referencesTimeField = false;
      Walker.walk(def, {
        visitColumn(col) {
          if (col.name === timeFieldName) referencesTimeField = true;
        },
      });
      if (referencesTimeField) result.add(field);
    }
  } catch {
    // Don't block initialization on parse errors
  }
  return result;
}
