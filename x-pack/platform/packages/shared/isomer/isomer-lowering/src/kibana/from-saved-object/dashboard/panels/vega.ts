/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AdaptivePanel } from '../../../model/adaptive_dashboard';
import { parseKibanaVegaSpec } from '../../../../vega';

import { type LowerPanelArgs, unsupportedPanel } from './types';

/** The `vega` embeddable's spec: HJSON text, or JSON as an object. A legacy visualization's `params.spec` is bare text. */
type StoredVegaSpec =
  | { format: 'hjson'; value: string }
  | { format: 'json'; value: Record<string, unknown> }
  | string;

const specText = (spec: unknown): string | undefined => {
  if (typeof spec === 'string') {
    return spec;
  }
  const stored = spec as Exclude<StoredVegaSpec, string> | undefined;
  if (stored?.format === 'hjson' && typeof stored.value === 'string') {
    return stored.value;
  }
  if (stored?.format === 'json' && stored.value && typeof stored.value === 'object') {
    return JSON.stringify(stored.value);
  }
  return undefined;
};

/** The `vega` embeddable (Kibana 9.4), by value in the panel or by reference to a `vega` saved object. */
export const lowerVegaPanel = (args: LowerPanelArgs): AdaptivePanel => {
  const { panel, panelEnvelope, refId, diagnostics } = args;
  const stored = panelEnvelope?.attributes as { spec?: unknown; title?: unknown } | undefined;
  const text = specText(stored?.spec ?? panel.embeddableConfig?.spec);
  const title =
    panel.title ?? (typeof stored?.title === 'string' ? stored.title : undefined) ?? 'Vega';
  if (!text) {
    diagnostics.push({
      level: 'warn',
      code: 'dashboard.vega-empty',
      message: `Vega panel "${refId ?? '<inline>'}" has no spec`,
    });
    return unsupportedPanel({ ...args, reason: 'Vega panel has no spec', title });
  }
  try {
    const { mode, spec } = parseKibanaVegaSpec(text);
    return { type: 'vega', title, mode, spec };
  } catch (error) {
    diagnostics.push({
      level: 'warn',
      code: 'dashboard.vega-unparsable',
      message: `Vega panel "${refId ?? title}" did not parse: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
    return unsupportedPanel({ ...args, reason: 'Vega spec did not parse', title });
  }
};
