/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseHjson } from 'hjson';
import { CUSTOM_CONTENT_EMBEDDABLE_TYPE } from '@kbn/custom-content-common';
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown-schemas';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { VEGA_VIS_TYPE } from '@kbn/agent-builder-visualizations-common';
import type { AttachmentPanel } from './types';

const isEsqlDataSourceCarrier = (carrier: unknown): boolean => {
  const dataSource = (carrier as { data_source?: { type?: unknown } } | null)?.data_source;
  return dataSource?.type === 'esql';
};

/**
 * Whether a Lens panel reads its data through ES|QL. Only those can be edited; other Lens panels
 * (data views, by reference) cannot.
 */
export const isEsqlLensPanel = ({ type, config }: AttachmentPanel): boolean => {
  if (type !== LENS_EMBEDDABLE_TYPE) {
    return false;
  }
  const { layers } = (config ?? {}) as { layers?: unknown };
  return (Array.isArray(layers) ? layers : [config]).some(isEsqlDataSourceCarrier);
};

/** Parses a Vega panel's HJSON (or JSON) spec string; `undefined` when it does not parse. */
export const parseVegaSpec = (spec: unknown): unknown => {
  if (typeof spec !== 'string') {
    return spec;
  }
  try {
    return parseHjson(spec);
  } catch {
    return undefined;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/** Vega-Lite keys that hold nested views, whose own `data` the Vega author drops. */
const CHILD_VIEW_KEYS = ['spec', 'layer', 'concat', 'hconcat', 'vconcat'] as const;

/** The keys of the ES|QL `url` the Vega author writes: `%type%`, `query`, and `%context%: true`. */
const ESQL_URL_KEYS_EDITS_KEEP = new Set(['%type%', 'query', '%context%']);

const isEsqlUrlEditsKeep = (url: unknown): boolean =>
  isRecord(url) &&
  url['%type%'] === 'esql' &&
  (url['%context%'] === undefined || url['%context%'] === true) &&
  Object.keys(url).every((key) => ESQL_URL_KEYS_EDITS_KEEP.has(key));

const isRootDataEditsKeep = (data: unknown): boolean =>
  data === undefined ||
  (isRecord(data) && Object.keys(data).length === 1 && isEsqlUrlEditsKeep(data.url));

const nestedViewDeclaresData = (view: Record<string, unknown>): boolean =>
  CHILD_VIEW_KEYS.flatMap((key) => [view[key]].flat())
    .filter(isRecord)
    .some((child) => 'data' in child || nestedViewDeclaresData(child));

/**
 * Whether a Vega panel reads data that an edit cannot keep. The Vega author replaces the root
 * `data` with one ES|QL `url` and drops `data` from nested views, so a panel is editable only when
 * its root `data` is absent or just an ES|QL `url` with no options beyond `%context%: true`, and no
 * nested view declares its own `data`. Query DSL, map files, external urls, inline `values`, a
 * `format`, other url options, Vega `data` arrays and nested view sources would be lost. A lookup's `from.data` is kept, so it does not block an edit. A panel whose spec
 * does not parse is blocked too, since its data sources are unknown.
 */
export const readsDataVegaEditsCannotKeep = ({ type, config }: AttachmentPanel): boolean => {
  if (type !== VEGA_VIS_TYPE) {
    return false;
  }
  const spec = parseVegaSpec(config?.spec);
  if (!isRecord(spec)) {
    return true;
  }
  return !isRootDataEditsKeep(spec.data) || nestedViewDeclaresData(spec);
};

/**
 * The panel types the agent can edit through `generate_dashboard`, with any check the panel itself
 * must pass. The single source for both the pointer's `editable` flag in the browser and the edit
 * check in `@kbn/dashboard-agent-authoring`: a panel kind whose type is missing here cannot edit.
 */
const AGENT_EDITABLE_PANEL_TYPES: ReadonlyMap<string, (panel: AttachmentPanel) => boolean> =
  new Map([
    [LENS_EMBEDDABLE_TYPE, isEsqlLensPanel],
    [VEGA_VIS_TYPE, (panel: AttachmentPanel) => !readsDataVegaEditsCannotKeep(panel)],
    [CUSTOM_CONTENT_EMBEDDABLE_TYPE, () => true],
    [MARKDOWN_EMBEDDABLE_TYPE, () => true],
    ['ml_anomaly_charts', () => true],
    ['ml_anomaly_swimlane', () => true],
    ['ml_single_metric_viewer', () => true],
  ]);

/** Whether the agent can edit the panel in place, from its serialized type and config. */
export const isAgentEditablePanel = (panel: AttachmentPanel): boolean =>
  AGENT_EDITABLE_PANEL_TYPES.get(panel.type)?.(panel) ?? false;
