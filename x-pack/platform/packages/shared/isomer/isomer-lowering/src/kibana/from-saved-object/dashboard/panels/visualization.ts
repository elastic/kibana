/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AdaptivePanel } from '../../../model/adaptive_dashboard';
import type { AdaptiveLens } from '../../../model/adaptive_lens';
import { parseKibanaVegaSpec } from '../../../../vega';
import { esqlSource } from '../../lens/esql';

import { deepLinkFor, type LowerPanelArgs, unsupportedPanel } from './types';

interface VisStateMarkdown {
  type: 'markdown';
  params?: { markdown?: string; openLinksInNewTab?: boolean };
  title?: string;
}

interface VisStateTsvb {
  type: 'metrics';
  params?: { type?: 'timeseries' | 'metric' | 'top_n' | 'gauge' | 'markdown' };
  title?: string;
}

interface VisStateVega {
  type: 'vega';
  params?: { spec?: string };
  title?: string;
}

interface VisStateLegacyMetric {
  type: 'metric';
  aggs?: LegacyMetricAgg[];
  title?: string;
}

interface LegacyMetricAgg {
  id?: string;
  enabled?: boolean;
  type?: string;
  schema?: string;
  params?: {
    field?: string;
    customLabel?: string;
  };
}

interface VisualizationSearchSource {
  index?: string;
  query?: { query?: string; language?: string };
}

const tryParseVisState = (
  raw: unknown
):
  | VisStateMarkdown
  | VisStateLegacyMetric
  | VisStateTsvb
  | VisStateVega
  | { type: string }
  | undefined => {
  if (typeof raw !== 'string' || raw.length === 0) {
    return undefined;
  }
  try {
    return JSON.parse(raw) as
      | VisStateMarkdown
      | VisStateLegacyMetric
      | VisStateTsvb
      | VisStateVega
      | { type: string };
  } catch {
    return undefined;
  }
};

const tryParseSearchSource = (raw: unknown): VisualizationSearchSource | undefined => {
  if (typeof raw !== 'string' || raw.length === 0) {
    return undefined;
  }
  try {
    return JSON.parse(raw) as VisualizationSearchSource;
  } catch {
    return undefined;
  }
};

const slug = (value: string | undefined, fallback: string): string => {
  const normalized = (value ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || fallback;
};

const legacyMetricOperation = (
  agg: LegacyMetricAgg
): { label: string; expression: string } | undefined => {
  const field = agg.params?.field;
  switch (agg.type) {
    case 'count':
      return { label: 'Count', expression: 'COUNT(*)' };
    case 'sum':
      return field ? { label: `Sum of ${field}`, expression: `SUM(${field})` } : undefined;
    case 'avg':
      return field ? { label: `Average of ${field}`, expression: `AVG(${field})` } : undefined;
    case 'min':
      return field ? { label: `Minimum of ${field}`, expression: `MIN(${field})` } : undefined;
    case 'max':
      return field ? { label: `Maximum of ${field}`, expression: `MAX(${field})` } : undefined;
    case 'cardinality':
      return field
        ? {
            label: `Unique count of ${field}`,
            expression: `COUNT_DISTINCT(${field})`,
          }
        : undefined;
    default:
      return undefined;
  }
};

const lowerLegacyMetricVisualization = ({
  panel,
  panelEnvelope,
  refId,
  kibanaBaseUrl,
  diagnostics,
  visState,
  title,
}: LowerPanelArgs & {
  visState: VisStateLegacyMetric;
  title: string;
}): AdaptivePanel | undefined => {
  const metricAgg = (visState.aggs ?? []).find(
    (agg) => agg.enabled !== false && agg.schema === 'metric'
  );
  if (!metricAgg) {
    diagnostics.push({
      level: 'warn',
      code: 'dashboard.legacy-metric-no-agg',
      message: `legacy metric visualization "${title}" has no enabled metric aggregation`,
    });
    return undefined;
  }

  const operation = legacyMetricOperation(metricAgg);
  if (!operation) {
    diagnostics.push({
      level: 'warn',
      code: 'dashboard.legacy-metric-agg-unsupported',
      message: `legacy metric aggregation "${metricAgg.type ?? '<unset>'}" cannot be lowered`,
    });
    return undefined;
  }

  const searchSource = tryParseSearchSource(
    (
      panelEnvelope?.attributes as
        | { kibanaSavedObjectMeta?: { searchSourceJSON?: unknown } }
        | undefined
    )?.kibanaSavedObjectMeta?.searchSourceJSON
  );
  const index = searchSource?.index ?? 'logs-*';
  if (!searchSource?.index) {
    diagnostics.push({
      level: 'info',
      code: 'dashboard.legacy-metric-index-fallback',
      message: `legacy metric visualization "${title}" has no searchSource index; using logs-*`,
    });
  }
  if (searchSource?.query?.query) {
    diagnostics.push({
      level: 'info',
      code: 'dashboard.legacy-metric-query-not-translated',
      message: `legacy metric query (${
        searchSource.query.language ?? 'kuery'
      }) not translated to ES|QL`,
    });
  }

  const metricId = `metric_${slug(metricAgg.id, 'value')}`;
  const panelId = `legacy-visualization:${refId ?? panel.panelIndex ?? metricId}`;
  const kibanaUrl = refId ? deepLinkFor('visualization', refId, kibanaBaseUrl) : undefined;
  const lens: AdaptiveLens = {
    id: panelId,
    title,
    chart: {
      kind: 'metric',
      primary: {
        id: metricId,
        label: metricAgg.params?.customLabel ?? operation.label,
      },
    },
    query: {
      esql: `FROM ${esqlSource(index)} | STATS ${metricId} = ${operation.expression}`,
    },
    provenance: {
      source: `Kibana saved object visualization/${refId ?? '<inline>'}`,
      visualizationType: 'metric',
      ...(refId ? { savedObjectId: refId } : {}),
      ...(kibanaUrl ? { kibanaUrl } : {}),
    },
  };

  diagnostics.push({
    level: 'info',
    code: 'dashboard.legacy-metric-lowered',
    message: `legacy metric visualization "${title}" lowered as an Adaptive metric`,
  });
  return { type: 'lens', lens };
};

const inlineVisStateFromSavedVis = (
  inlineSavedVis:
    | {
        visState?: unknown;
        title?: string;
        type?: string;
        params?: Record<string, unknown>;
      }
    | undefined
): { type: string; params?: Record<string, unknown>; title?: string } | undefined => {
  if (!inlineSavedVis?.type) {
    return undefined;
  }
  return {
    type: inlineSavedVis.type,
    ...(inlineSavedVis.params ? { params: inlineSavedVis.params } : {}),
    ...(inlineSavedVis.title ? { title: inlineSavedVis.title } : {}),
  };
};

export const lowerVisualizationPanel = (args: LowerPanelArgs): AdaptivePanel => {
  const { panelEnvelope, panel, refId, diagnostics } = args;
  const inlineSavedVis = panel.embeddableConfig?.savedVis as
    | {
        visState?: unknown;
        title?: string;
        type?: string;
        params?: Record<string, unknown>;
      }
    | undefined;
  const envelopeVisState = (panelEnvelope?.attributes as { visState?: unknown } | undefined)
    ?.visState;
  const visState =
    tryParseVisState(envelopeVisState ?? inlineSavedVis?.visState) ??
    inlineVisStateFromSavedVis(inlineSavedVis);
  if (!visState) {
    const reason = 'visualization has no parseable visState';
    diagnostics.push({
      level: 'warn',
      code: 'dashboard.visualization-unsupported',
      message: reason,
    });
    return unsupportedPanel({
      ...args,
      refType: 'visualization',
      reason,
    });
  }

  const title =
    panel.title ??
    inlineSavedVis?.title ??
    (panelEnvelope?.attributes as { title?: string } | undefined)?.title;
  if (visState.type === 'markdown') {
    return {
      type: 'markdown',
      body: (visState as VisStateMarkdown).params?.markdown ?? '',
      ...(title ? { title } : {}),
    };
  }
  if (visState.type === 'metric') {
    const lowered = lowerLegacyMetricVisualization({
      ...args,
      diagnostics,
      visState: visState as VisStateLegacyMetric,
      title: title ?? 'Metric',
    });
    if (lowered) {
      return lowered;
    }
  }
  if (visState.type === 'vega') {
    try {
      const { mode, spec } = parseKibanaVegaSpec((visState as VisStateVega).params?.spec ?? '');
      return { type: 'vega', title: title ?? 'Vega', mode, spec };
    } catch (error) {
      diagnostics.push({
        level: 'warn',
        code: 'dashboard.vega-unparsable',
        message: `Vega visualization "${title ?? refId ?? 'unknown'}" did not parse: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    }
  }
  if (visState.type === 'metrics' || visState.type === 'vega') {
    const label = visState.type === 'metrics' ? 'TSVB' : 'Vega';
    diagnostics.push({
      level: 'warn',
      code: visState.type === 'metrics' ? 'dashboard.tsvb-degraded' : 'dashboard.vega-degraded',
      message: `${label} visualization "${
        title ?? refId ?? 'unknown'
      }" has no static lowering; surfacing a deep link`,
    });
    return unsupportedPanel({
      ...args,
      refType: 'visualization',
      reason: `${label} visualizations require a runtime renderer; opening the panel in Kibana is the recommended path`,
      ...(title ? { title } : {}),
    });
  }

  diagnostics.push({
    level: 'warn',
    code: 'dashboard.visualization-unsupported',
    message: `visualization type "${visState.type}" is not supported by the converter`,
  });
  return unsupportedPanel({
    ...args,
    refType: 'visualization',
    reason: `visualization type "${visState.type}" is not supported`,
    ...(title ? { title } : {}),
  });
};
