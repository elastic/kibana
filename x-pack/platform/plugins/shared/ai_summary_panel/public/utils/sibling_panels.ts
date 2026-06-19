/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface PanelDescriptor {
  title: string;
  key: string;
  esqlQuery: string;
}

// Normalizes a panel title to a valid Liquid variable key.
// "Revenue by Category" → "revenue_by_category"
export function titleToKey(title: string, index: number): string {
  const key = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return key || `panel_${index}`;
}

// Extracts an ES|QL query from any embeddable via duck typing.
// Handles ai_summary_panel (top-level esqlQuery) and Lens ES|QL panels
// (attributes.state.datasourceStates.textBased.layers[*].query.esql).
export function extractPanelDescriptor(api: unknown, index: number): PanelDescriptor | null {
  if (!api || typeof api !== 'object') return null;
  const a = api as Record<string, unknown>;

  if (typeof a.serializeState !== 'function') return null;

  let state: Record<string, unknown>;
  try {
    state = (a.serializeState as () => unknown)() as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!state) return null;

  const rawTitle =
    (state.title as string | undefined) ??
    ((state.attributes as Record<string, unknown> | undefined)?.title as string | undefined) ??
    `Panel ${index + 1}`;
  const title = String(rawTitle);

  // ai_summary_panel: top-level esqlQuery field
  if (typeof state.esqlQuery === 'string' && state.esqlQuery.trim()) {
    return { title, key: titleToKey(title, index), esqlQuery: state.esqlQuery };
  }

  // Lens ES|QL: attributes.state.datasourceStates.textBased.layers[*].query.esql
  try {
    type Obj = Record<string, unknown>;
    const lensState = ((state.attributes as Obj)?.state as Obj) ?? {};
    const textBased = ((lensState.datasourceStates as Obj) ?? {}).textBased as Obj;
    const layers = textBased?.layers;

    if (layers && typeof layers === 'object') {
      for (const layer of Object.values(layers as Obj)) {
        const esql = ((layer as Obj)?.query as Obj)?.esql;
        if (typeof esql === 'string' && esql.trim()) {
          return { title, key: titleToKey(title, index), esqlQuery: esql };
        }
      }
    }
  } catch {
    /* non-fatal */
  }

  return null;
}

// Extracts the ES|QL query string from a sibling panel for signature purposes.
// Returns null if the panel has no ES|QL query.
export function extractEsqlQuery(api: unknown): string | null {
  const descriptor = extractPanelDescriptor(api, 0);
  return descriptor?.esqlQuery ?? null;
}
