/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeField } from './esql';
import type { ResolvedTimeWindow, SynthesisInput, SynthesisOutput } from './query_types';
import { resolveTimeWindow } from './time';
import type { LensState, TextBasedLayer } from './types';

export const firstTextBasedLayer = (
  state: LensState
): { id: string; layer: TextBasedLayer } | undefined => {
  const layers = state.datasourceStates?.textBased?.layers;
  if (!layers) {
    return undefined;
  }
  const entries = Object.entries(layers);
  const first = entries[0];
  return first ? { id: first[0], layer: first[1] } : undefined;
};

export const synthesizeFromTextBased = (
  layer: { id: string; layer: TextBasedLayer },
  input: SynthesisInput
): SynthesisOutput => {
  const { layer: textLayer, id } = layer;
  const { diagnostics } = input;
  let esql = textLayer.query.esql;

  const timeWindow = resolveTimeWindow(input.timeRange, diagnostics);
  if (timeWindow) {
    const timeField = textLayer.timeField ?? input.timeFieldName ?? '@timestamp';
    esql = injectEsqlTimeFilter(esql, timeField, timeWindow);
    diagnostics.push({
      level: 'info',
      code: 'lens.textBased.time-range-injected',
      message: `injected dashboard time range on "${timeField}" into the ES|QL query`,
    });
  }

  return {
    query: {
      esql,
      ...(textLayer.index ? { indexPattern: textLayer.index } : {}),
    },
    resolvedLayerId: id,
  };
};

const injectEsqlTimeFilter = (
  esql: string,
  timeField: string,
  window: ResolvedTimeWindow
): string => {
  const timeFieldEsql = escapeField(timeField);
  const clause = `WHERE ${timeFieldEsql} >= ${window.fromEsql} AND ${timeFieldEsql} <= ${window.toEsql}`;
  const pipeIndex = esql.indexOf('|');
  if (pipeIndex < 0) {
    return `${esql.trim()} | ${clause}`;
  }
  const head = esql.slice(0, pipeIndex).trimEnd();
  const tail = esql.slice(pipeIndex).trimStart();
  return `${head} | ${clause} ${tail}`;
};
