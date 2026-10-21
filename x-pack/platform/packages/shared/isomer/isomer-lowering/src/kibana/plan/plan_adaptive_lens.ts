/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ViewSpec } from '../adaptive_nodes';
import type { AdaptiveChart, AdaptiveLens, PrimitiveRenderHints } from '../model/adaptive_lens';
import {
  type AdaptivePrimitiveProfile,
  type ReductionPolicy,
  reductionsForProfile,
  type ReductionTarget,
} from '../model/reductions';

import { buildPlaceholderNode } from './placeholder_node';
import type { ViewPlan, ViewPlanBinding, ViewPlanDiagnostic, ViewPlanQuery } from './view_plan';

export interface PlanAdaptiveLensOptions {
  /**
   * Optional stable id to use for the binding. Defaults to `lens.id`.
   */
  bindingId?: string;
  /**
   * Diagnostics carried over from the lowering step (e.g.
   * `fromKibanaSavedObject` emits diagnostics when ES|QL is synthesized
   * from a legacy `searchSource` Lens). Merged into `plan.diagnostics`
   * unchanged.
   */
  diagnostics?: ViewPlanDiagnostic[];
  /**
   * `compact` keeps 10KB-friendly caps. `full` allows richer
   * primitive payloads and visual affordances for previews/screenshots.
   */
  profile?: AdaptivePrimitiveProfile;
  /**
   * Caller-supplied cap overrides applied after the selected profile and any
   * lens-level reduction hints.
   */
  reductions?: ReductionPolicy;
  rendering?: PrimitiveRenderHints;
}

export const reductionTargetForChart = (chart: AdaptiveChart): ReductionTarget | undefined => {
  switch (chart.kind) {
    case 'xy':
      return 'xy';
    case 'partition':
      return chart.layout === 'treemap' || chart.layout === 'mosaic' ? 'treemap' : 'partition';
    case 'datatable':
      return 'datatable';
    case 'metric':
    case 'gauge':
    case 'heatmap':
      return undefined;
    default: {
      const exhaustiveCheck: never = chart;
      void exhaustiveCheck;
      return undefined;
    }
  }
};

export const renderingHintsForChart = (
  chart: AdaptiveChart,
  profile: AdaptivePrimitiveProfile = 'compact'
): PrimitiveRenderHints | undefined => {
  if (profile === 'full' && chart.kind === 'xy' && chart.mode !== 'bar') {
    return { showPointMarkers: true };
  }
  if (
    profile === 'full' &&
    chart.kind === 'partition' &&
    (chart.layout === 'treemap' || chart.layout === 'mosaic')
  ) {
    return { showCategoryLegend: true };
  }
  return undefined;
};

export const reductionsForChart = (
  chart: AdaptiveChart,
  profile: AdaptivePrimitiveProfile | undefined = undefined,
  lensReductions?: ReductionPolicy,
  optionReductions?: ReductionPolicy
): ReductionPolicy | undefined => {
  const target = reductionTargetForChart(chart);
  if (profile !== 'full' && !lensReductions && !optionReductions) {
    return undefined;
  }
  const reductions = {
    ...(target && profile === 'full' ? reductionsForProfile(target, profile) : {}),
    ...(lensReductions ?? {}),
    ...(optionReductions ?? {}),
  };
  return Object.keys(reductions).length > 0 ? reductions : undefined;
};

/**
 * Produce a {@link ViewPlan} for a single {@link AdaptiveLens}.
 *
 * The returned `plan.spec` is a fully-valid `ViewSpec` whose body contains
 * one `callout` placeholder. Hosts can render it as a loading skeleton,
 * then call `bindViewPlan(plan, dataTables)` once `plan.queries[*].query`
 * has been executed.
 */
export const planAdaptiveLens = (
  lens: AdaptiveLens,
  options: PlanAdaptiveLensOptions = {}
): ViewPlan => {
  const bindingId = options.bindingId ?? lens.id;
  const placeholder = buildPlaceholderNode({
    title: lens.title,
    chart: lens.chart,
  });

  const spec: ViewSpec = {
    type: 'view',
    title: lens.title,
    ...(lens.subtitle ? { subtitle: lens.subtitle } : {}),
    body: [placeholder],
    ...(lens.provenance
      ? {
          meta: {
            source: lens.provenance.source,
            ...(lens.provenance.kibanaUrl
              ? {
                  provenance: {
                    source: lens.provenance.source,
                    provider: 'kibana',
                  },
                }
              : {}),
          },
        }
      : {}),
  };

  const query: ViewPlanQuery = {
    id: bindingId,
    query: lens.query,
    chart: lens.chart,
    label: lens.title,
    ...(lens.format ? { format: lens.format } : {}),
    ...(() => {
      const reductions = reductionsForChart(
        lens.chart,
        options.profile,
        lens.reductions,
        options.reductions
      );
      return reductions ? { reductions } : {};
    })(),
    ...(() => {
      const profileHints = renderingHintsForChart(lens.chart, options.profile);
      const rendering = {
        ...(profileHints ?? {}),
        ...(lens.rendering ?? {}),
        ...(options.rendering ?? {}),
      };
      return Object.keys(rendering).length > 0 ? { rendering } : {};
    })(),
  };

  const trendQuery =
    lens.chart.kind === 'metric' && lens.chart.trend?.query
      ? {
          id: `${bindingId}:trend`,
          query: lens.chart.trend.query,
          chart: lens.chart,
          label: `${lens.title} trend`,
          ...(lens.format ? { format: lens.format } : {}),
        }
      : undefined;

  const binding: ViewPlanBinding = {
    queryId: bindingId,
    specPath: ['body', 0],
    chart: lens.chart,
    ...(trendQuery ? { auxiliaryQueryIds: { trend: trendQuery.id } } : {}),
    ...(lens.references ? { references: lens.references } : {}),
    ...(query.reductions ? { reductions: query.reductions } : {}),
    ...(query.rendering ? { rendering: query.rendering } : {}),
  };

  return {
    spec,
    queries: trendQuery ? [query, trendQuery] : [query],
    bindings: [binding],
    diagnostics: options.diagnostics ?? [],
  };
};
