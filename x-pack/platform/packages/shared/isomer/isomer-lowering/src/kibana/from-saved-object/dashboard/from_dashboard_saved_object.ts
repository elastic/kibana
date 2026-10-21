/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type AdaptiveDashboard,
  type AdaptiveDashboardGridItem,
  type AdaptivePanel,
  type Filter,
  KIBANA_DASHBOARD_GRID_COLUMNS,
  KIBANA_DASHBOARD_ROW_HEIGHT,
  type TimeRange,
} from '../../model/adaptive_dashboard';
import type { ViewPlanDiagnostic } from '../../plan/view_plan';
import { fromLensSavedObject, type FromLensSavedObjectOptions } from '../lens';
import { createDiagnosticBag } from '../lens/diagnostics';
import { escapeField } from '../lens/esql';
import { translateKqlToEsql } from '../lens/kql_to_esql';
import { lowerKibanaFilterToEsql } from '../lens/lens_filters';
import type { SavedObjectEnvelope } from '../ndjson';
import { SavedObjectEnvelopeSchema } from '../schema';

import { lowerLongTailPanel } from './from_panel';
import { isLensPanelType } from './panel_types';
import type { DashboardAttributes, DashboardPanel, DashboardSearchSource } from './types';

export interface FromKibanaDashboardSavedObjectOptions extends FromLensSavedObjectOptions {
  /**
   * Resolves a panel reference (`{ name, type, id }`) into the saved-object
   * envelope for that panel. The host fetches these from Kibana's
   * `GET /api/saved_objects/{type}/{id}` endpoint and passes them in; the
   * converter stays I/O-free.
   *
   * Return `undefined` when the panel cannot be loaded — the dashboard
   * adapter degrades the panel to `type: 'unsupported'` with a diagnostic.
   */
  resolvePanelEnvelope?: (ref: {
    name: string;
    type: string;
    id: string;
  }) => SavedObjectEnvelope | undefined;
  /**
   * Opt-in hand-written degradations for panel types the converter cannot
   * lower automatically (e.g. TSVB, Vega, or a private embeddable). The
   * function receives the panel envelope and the in-dashboard panel spec
   * and may return any `AdaptivePanel`; returning `undefined` falls
   * through to the default degradation.
   *
   * Keyed by saved-object type and id so a host can target a specific
   * dashboard panel without intercepting every TSVB on the page.
   */
  customDegradations?: (args: {
    ref: { name: string; type: string; id: string };
    panelEnvelope?: SavedObjectEnvelope;
  }) => import('../../model/adaptive_dashboard').AdaptivePanel | undefined;
}

export interface FromKibanaDashboardSavedObjectResult {
  dashboard: AdaptiveDashboard | undefined;
  diagnostics: ViewPlanDiagnostic[];
}

const tryParseJson = <T>(
  raw: string | undefined,
  fallback: T,
  onError: (message: string) => void
): T => {
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    onError(error instanceof Error ? error.message : String(error));
    return fallback;
  }
};

const collectRows = (panels: DashboardPanel[]): number[][] => {
  // Kibana stores absolute (x, y) grid positions; we group panels by
  // sorted `y` value so the consumer can lay them out as horizontal rows on
  // desktop and stack them on mobile.
  const indexedPanels = panels.map((panel, index) => ({
    index,
    y: panel.gridData?.y ?? index,
    x: panel.gridData?.x ?? 0,
  }));
  const byY = new Map<number, Array<{ index: number; x: number }>>();
  for (const entry of indexedPanels) {
    const bucket = byY.get(entry.y) ?? [];
    bucket.push({ index: entry.index, x: entry.x });
    byY.set(entry.y, bucket);
  }
  return [...byY.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, bucket]) => bucket.sort((a, b) => a.x - b.x).map((p) => p.index));
};

// Kibana stores a panel's custom display title either at the top level
// (`panel.title`, common for byReference panels) or inside the panel config
// (`embeddableConfig.title`, common for byValue panels). A non-empty value
// here overrides the embeddable's own title in Kibana's rendering.
const panelDisplayTitle = (panel: DashboardPanel): string | undefined => {
  for (const candidate of [panel.title, panel.embeddableConfig?.title]) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return undefined;
};

const panelTitlesHidden = (panel: DashboardPanel): boolean =>
  panel.hidePanelTitles === true || panel.embeddableConfig?.hidePanelTitles === true;

const trimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const collectGrid = (
  panels: DashboardPanel[]
): NonNullable<AdaptiveDashboard['layoutHint']>['grid'] | undefined => {
  const items: AdaptiveDashboardGridItem[] = panels
    .map((panel, panelIndex) => {
      const grid = panel.gridData;
      if (!grid) {
        return undefined;
      }
      return {
        panelIndex,
        x: grid.x,
        y: grid.y,
        w: grid.w,
        h: grid.h,
      };
    })
    .filter((item): item is AdaptiveDashboardGridItem => Boolean(item));

  const columns = KIBANA_DASHBOARD_GRID_COLUMNS;
  return items.length > 0 ? { columns, rowHeight: KIBANA_DASHBOARD_ROW_HEIGHT, items } : undefined;
};

/**
 * Lower a single Kibana dashboard saved-object envelope into an
 * `AdaptiveDashboard`.
 *
 * Caller provides `resolvePanelEnvelope` so the adapter can read the actual
 * panel saved objects without doing any I/O itself.
 */
export const fromKibanaDashboardSavedObject = (
  rawEnvelope: SavedObjectEnvelope,
  options: FromKibanaDashboardSavedObjectOptions = {}
): FromKibanaDashboardSavedObjectResult => {
  const parsedEnvelope = SavedObjectEnvelopeSchema.safeParse(rawEnvelope);
  const envelope = parsedEnvelope.success ? parsedEnvelope.data : undefined;
  const bag = createDiagnosticBag(envelope?.id);
  if (!envelope) {
    bag.push({
      level: 'error',
      code: 'dashboard.invalid-envelope',
      message: 'Dashboard saved-object envelope failed runtime validation',
    });
    return { dashboard: undefined, diagnostics: bag.list };
  }
  if (envelope.type !== 'dashboard') {
    bag.push({
      level: 'error',
      code: 'dashboard.wrong-type',
      message: `expected a "dashboard" envelope; got "${envelope.type}"`,
    });
    return { dashboard: undefined, diagnostics: bag.list };
  }

  const attributes = envelope.attributes as Partial<DashboardAttributes>;
  if (!attributes || typeof attributes !== 'object') {
    bag.push({
      level: 'error',
      code: 'dashboard.no-attributes',
      message: 'saved-object envelope has no attributes',
    });
    return { dashboard: undefined, diagnostics: bag.list };
  }

  const panelsRaw = attributes.panelsJSON;
  if (typeof panelsRaw !== 'string' || panelsRaw.length === 0) {
    bag.push({
      level: 'error',
      code: 'dashboard.no-panels',
      message: 'dashboard has no `panelsJSON`',
    });
    return { dashboard: undefined, diagnostics: bag.list };
  }

  const panels = tryParseJson<DashboardPanel[]>(panelsRaw, [], (message) =>
    bag.push({
      level: 'error',
      code: 'dashboard.panels-json-malformed',
      message: `panelsJSON could not be parsed: ${message}`,
    })
  );

  const searchSource = tryParseJson<DashboardSearchSource>(
    attributes.kibanaSavedObjectMeta?.searchSourceJSON,
    {},
    (message) =>
      bag.push({
        level: 'warn',
        code: 'dashboard.search-source-malformed',
        message: `searchSourceJSON could not be parsed: ${message}`,
      })
  );

  // Dashboard filters carry display metadata separately from their query DSL.
  // Phrase/phrases also lower to ES|QL so the planner can inject them into
  // each panel query — without that, every metric on a dashboard that
  // differs only by `state.filters` would execute the same STATS.
  const filters: Filter[] = (searchSource.filter ?? []).map((raw, index): Filter => {
    const meta =
      (
        raw as {
          meta?: { alias?: unknown; key?: unknown; disabled?: unknown };
        }
      ).meta ?? {};
    const label =
      (typeof meta.alias === 'string' && meta.alias) ||
      (typeof meta.key === 'string' && meta.key) ||
      `Filter #${index + 1}`;
    if (meta.disabled === true) {
      return { label };
    }
    const esql = lowerKibanaFilterToEsql(raw);
    if (!esql) {
      bag.push({
        level: 'warn',
        code: 'dashboard.filter-unsupported',
        message: `dashboard filter "${label}" could not be lowered to ES|QL`,
      });
    }
    return { label, ...(esql ? { esql } : {}) };
  });

  // The dashboard's top-level query (KQL/Lucene) is preserved as a filter so
  // panels can surface "applies kql `status:error`" without losing the text.
  if (
    searchSource.query?.query &&
    typeof searchSource.query.query === 'string' &&
    searchSource.query.query.length > 0
  ) {
    const language = searchSource.query.language ?? 'kuery';
    // A filter with no `esql` is dropped by the planner, so every panel then
    // runs without the dashboard query. That is a materially different result
    // from the one Kibana shows, and it has to be said out loud rather than
    // inferred from a filter that happens to carry only `kql`. `'true'` is
    // not a failure — it is a query that genuinely constrains nothing.
    if (language === 'lucene') {
      bag.push({
        level: 'warn',
        code: 'dashboard.query-unsupported',
        message: `dashboard lucene query "${searchSource.query.query}" is not lowered to ES|QL; panels run without it`,
      });
      filters.unshift({
        lucene: searchSource.query.query,
        label: 'Dashboard query (lucene)',
      });
    } else {
      const esql = translateKqlToEsql(searchSource.query.query, escapeField);
      if (!esql) {
        bag.push({
          level: 'warn',
          code: 'dashboard.query-unsupported',
          message: `dashboard kuery query "${searchSource.query.query}" could not be lowered to ES|QL; panels run without it`,
        });
      }
      filters.unshift({
        kql: searchSource.query.query,
        label: 'Dashboard query (kql)',
        ...(esql && esql !== 'true' ? { esql } : {}),
      });
    }
  }

  // Caller-supplied `timeRange` wins over the saved dashboard's range.
  const savedTimeRange: TimeRange | undefined =
    attributes.timeFrom && attributes.timeTo
      ? { from: attributes.timeFrom, to: attributes.timeTo }
      : undefined;
  const timeRange: TimeRange | undefined = options.timeRange ?? savedTimeRange;
  const lensOptions: FromKibanaDashboardSavedObjectOptions = timeRange
    ? { ...options, timeRange }
    : options;

  const adaptivePanels: AdaptivePanel[] = panels.map((panel, panelIndex) => {
    // Kibana 8.x dashboards namespace every panel-level reference with the
    // panel's index/uuid (e.g. `4:panel_4`) before storing them on the
    // dashboard envelope. When a panel itself uses the bare ref name we
    // accept either form so byReference panels still resolve.
    const lookupName = panel.panelRefName;
    const ref = lookupName
      ? envelope.references?.find(
          (r) =>
            r.name === lookupName ||
            r.name === `${panel.panelIndex ?? ''}:${lookupName}` ||
            r.name.endsWith(`:${lookupName}`)
        )
      : undefined;
    if (!ref) {
      // Inline Lens panels carry their attributes at `embeddableConfig.attributes`.
      // Kibana 9.4 stores the same blob under panel type `vis`.
      if (isLensPanelType(panel.type)) {
        const inlineAttributes = panel.embeddableConfig?.['attributes'] as
          | Record<string, unknown>
          | undefined;
        if (
          inlineAttributes &&
          typeof inlineAttributes === 'object' &&
          'visualizationType' in inlineAttributes
        ) {
          const inlineReferences = (inlineAttributes['references'] ??
            panel.embeddableConfig?.['references']) as
            | Array<{ id: string; type: string; name: string }>
            | undefined;
          const syntheticId = `${envelope.id}:panel:${
            panel.panelIndex ?? panel.gridData?.i ?? String(panelIndex)
          }`;
          const syntheticEnvelope: SavedObjectEnvelope = {
            id: syntheticId,
            type: 'lens',
            attributes: inlineAttributes,
            ...(inlineReferences ? { references: inlineReferences } : {}),
          };
          const { lens, diagnostics } = fromLensSavedObject(syntheticEnvelope, lensOptions);
          bag.list.push(...diagnostics);
          if (lens) {
            // Match Kibana: inline Lens titles come from the dashboard panel.
            lens.title = panelTitlesHidden(panel) ? '' : panelDisplayTitle(panel) ?? '';
            return { type: 'lens', lens };
          }
          return {
            type: 'unsupported',
            reason: `inline Lens panel "${syntheticId}" could not be lowered`,
            ...(panel.title ? { title: panel.title } : {}),
          };
        }
      }
      return lowerLongTailPanel({
        panel,
        refType: panel.type,
        diagnostics: bag,
        ...(options.kibanaBaseUrl ? { kibanaBaseUrl: options.kibanaBaseUrl } : {}),
        ...(options.resolveReferenceTitle
          ? { resolveReferenceTitle: options.resolveReferenceTitle }
          : {}),
        ...(options.resolveDataViewFieldFormats
          ? { resolveDataViewFieldFormats: options.resolveDataViewFieldFormats }
          : {}),
      });
    }

    const panelEnvelope = options.resolvePanelEnvelope?.(ref);
    if (!panelEnvelope) {
      bag.push({
        level: 'warn',
        code: 'dashboard.panel-envelope-missing',
        message: `panel reference "${ref.name}" (${ref.type}/${ref.id}) was not resolved by the host`,
      });
      return {
        type: 'unsupported',
        reason: `panel "${ref.name}" not loaded`,
        ...(panel.title ? { title: panel.title } : {}),
      };
    }

    // Host-provided degradations can override default panel lowering.
    const custom = options.customDegradations?.({
      ref,
      panelEnvelope,
    });
    if (custom) {
      bag.push({
        level: 'info',
        code: 'dashboard.custom-degradation-applied',
        message: `host-provided degradation applied to panel "${ref.name}" (${ref.type}/${ref.id})`,
      });
      return custom;
    }

    if (isLensPanelType(ref.type)) {
      const { lens, diagnostics } = fromLensSavedObject(panelEnvelope, lensOptions);
      bag.list.push(...diagnostics);
      if (lens) {
        // A custom panel title wins over the lens's own title (matches
        // Kibana rendering); fall back to the referenced library viz's
        // title. `hidePanelTitles` blanks it entirely.
        lens.title = panelTitlesHidden(panel)
          ? ''
          : panelDisplayTitle(panel) ??
            trimmedString((panelEnvelope.attributes as { title?: unknown }).title);
        return { type: 'lens', lens };
      }
      return {
        type: 'unsupported',
        reason: `lens panel "${ref.id}" could not be lowered`,
        ...(panel.title ? { title: panel.title } : {}),
        ...(options.kibanaBaseUrl
          ? {
              deepLink: `${options.kibanaBaseUrl.replace(
                /\/$/,
                ''
              )}/app/lens#/edit/${encodeURIComponent(ref.id)}`,
            }
          : {}),
      };
    }

    // Non-Lens panels either lower directly or fall back to deep-linked `unsupported`.
    return lowerLongTailPanel({
      panel,
      panelEnvelope,
      refType: ref.type,
      refId: ref.id,
      ...(options.kibanaBaseUrl ? { kibanaBaseUrl: options.kibanaBaseUrl } : {}),
      ...(options.resolveReferenceTitle
        ? { resolveReferenceTitle: options.resolveReferenceTitle }
        : {}),
      ...(options.resolveDataViewFieldFormats
        ? { resolveDataViewFieldFormats: options.resolveDataViewFieldFormats }
        : {}),
      diagnostics: bag,
    });
  });

  const grid = collectGrid(panels);
  const dashboard: AdaptiveDashboard = {
    id: envelope.id,
    title: attributes.title ?? `Dashboard ${envelope.id}`,
    ...(attributes.description ? { subtitle: attributes.description } : {}),
    panels: adaptivePanels,
    ...(timeRange ? { timeRange } : {}),
    ...(filters.length > 0 ? { filters } : {}),
    layoutHint: {
      rows: collectRows(panels),
      ...(grid ? { grid } : {}),
    },
    provenance: {
      source: `Kibana saved object dashboard/${envelope.id}`,
      savedObjectId: envelope.id,
      ...(options.kibanaBaseUrl
        ? {
            kibanaUrl: `${options.kibanaBaseUrl.replace(
              /\/$/,
              ''
            )}/app/dashboards#/view/${encodeURIComponent(envelope.id)}`,
          }
        : {}),
    },
  };

  return { dashboard, diagnostics: bag.list };
};

export type { DashboardAttributes, DashboardPanel, DashboardSearchSource };
