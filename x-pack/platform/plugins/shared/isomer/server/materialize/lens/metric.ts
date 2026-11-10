/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';
import type { MetricNode } from '@kbn/isomer';
import { euiDarkVars, euiLightVars } from '@kbn/ui-theme';
import type { MaterializeLoss, MaterializedNode } from '../nodes';
import type { MaterializeKit } from '../types';
import { createUnsupportedNode } from '../unsupported';
import { toHexColor } from '../kit/colors';
import type { ConcreteColor } from '../kit/colors';
import type { ChartColumnRole } from '../kit/types';
import { collapseTable } from './collapse';
import { applyLensFormats } from './formats';
import {
  collectColumns,
  findColumn,
  fixedColor,
  lensLink,
  timeFilterLoss,
  toChartGlyph,
} from './shared';
import type { LensMetricConfig, LensSavedObjectReference } from './types';

type MetricValue = MetricNode['value'];
type MetricSecondary = NonNullable<MetricNode['secondary']>;
type MetricBands = NonNullable<NonNullable<MetricNode['colors']>['bands']>;
type PrimaryMetric = Extract<LensMetricConfig['metrics'][number], { type: 'primary' }>;
type SecondaryMetric = Extract<LensMetricConfig['metrics'][number], { type: 'secondary' }>;
type PrimaryColor = NonNullable<PrimaryMetric['color']>;
type ColorStep = Extract<PrimaryColor, { steps: unknown }>['steps'][number];
type EuiThemeVars = typeof euiLightVars;

const COMPARE_TO_PALETTE = 'compare_to';

/**
 * Lens's secondary trend text colors per palette, `[decrease, neutral, increase]`, from Lens's
 * metric visualization. An unknown palette, and any `_reversed` id, falls back to `compare_to`,
 * as Lens's lookup does.
 */
const compareTextColors = (paletteId: string, theme: EuiThemeVars): [string, string, string] => {
  const neutral = theme.euiColorTextParagraph;
  switch (paletteId) {
    case 'complementary':
      return [theme.euiColorTextPrimary, neutral, theme.euiColorTextWarning];
    case 'temperature':
      return [theme.euiColorTextPrimary, neutral, theme.euiColorTextDanger];
    default:
      return [theme.euiColorTextDanger, neutral, theme.euiColorTextSuccess];
  }
};

const isPrimary = (metric: LensMetricConfig['metrics'][number]): metric is PrimaryMetric =>
  metric.type === 'primary';

const isSecondary = (metric: LensMetricConfig['metrics'][number]): metric is SecondaryMetric =>
  metric.type === 'secondary';

const toBands = (steps: ColorStep[], path: string, losses: MaterializeLoss[]): MetricBands => {
  return steps.map(({ gte, lt, lte, color }, index) => {
    if (lte != null) {
      losses.push({
        path: `${path}.steps[${index}].lte`,
        kind: 'approximated',
        note: i18n.translate('xpack.isomer.materialize.lens.inclusiveBand', {
          defaultMessage: 'The last color band includes its upper bound in Kibana, but not here.',
        }),
      });
    }
    const to = lt ?? lte;
    return {
      ...(gte != null ? { from: gte } : {}),
      ...(to != null ? { to } : {}),
      color: fixedColor(color),
    };
  });
};

const primaryColor = (
  color: PrimaryColor | undefined,
  losses: MaterializeLoss[]
): {
  color?: MetricValue['color'];
  bandsRange?: MetricValue['bandsRange'];
  bands?: MetricBands;
} => {
  const path = 'metrics[0].color';
  switch (color?.type) {
    case 'static':
      return { color: fixedColor(color.color) };
    case 'dynamic':
    case 'legacy_dynamic':
      return {
        color: 'bands',
        bandsRange: color.range,
        bands: toBands(color.steps, path, losses),
      };
    case 'distributed_palette':
      losses.push({
        path,
        kind: 'dropped',
        note: i18n.translate('xpack.isomer.materialize.lens.distributedPalette', {
          defaultMessage: 'Colors distributed from the "{palette}" palette are not carried over.',
          values: { palette: color.palette },
        }),
      });
      return {};
    default:
      return {};
  }
};

const compareColors = (
  palette: string | undefined
): NonNullable<MetricSecondary['compare']>['colors'] => {
  const paletteId = palette ?? COMPARE_TO_PALETTE;
  const reversed = paletteId.includes('reversed');
  const order = (colors: [string, string, string]) =>
    (reversed ? [colors[2], colors[1], colors[0]] : colors).map(toHexColor);
  const light = order(compareTextColors(paletteId, euiLightVars));
  const dark = order(compareTextColors(paletteId, euiDarkVars));
  const pick = (index: number): ConcreteColor => ({ light: light[index], dark: dark[index] });
  return { decrease: pick(0), neutral: pick(1), increase: pick(2) };
};

const secondaryOf = (
  secondary: SecondaryMetric,
  { primaryIsNumber, secondaryIsNumber }: { primaryIsNumber: boolean; secondaryIsNumber: boolean },
  styling: LensMetricConfig['styling'],
  losses: MaterializeLoss[]
): MetricSecondary => {
  const label = styling?.secondary?.label;
  const { compare, color } = secondary;
  let compareNode: MetricSecondary['compare'];
  if (compare && secondaryIsNumber) {
    compareNode = {
      // Lens compares to 0 when the primary value it would compare to is not a number.
      ...(compare.to === 'primary' && primaryIsNumber
        ? { to: 'primary' as const }
        : { to: 'baseline' as const, baseline: compare.to === 'baseline' ? compare.baseline : 0 }),
      showIcon: compare.icon ?? true,
      showValue: compare.value ?? true,
      colors: compareColors(compare.palette),
    };
    losses.push({
      path: 'metrics[1].compare',
      kind: 'approximated',
      note: i18n.translate('xpack.isomer.materialize.lens.compareBadge', {
        defaultMessage:
          'The compared value keeps its text colors, not the badge background Kibana draws behind it.',
      }),
    });
  } else if (compare) {
    losses.push({
      path: 'metrics[1].compare',
      kind: 'dropped',
      note: i18n.translate('xpack.isomer.materialize.lens.compareNotNumber', {
        defaultMessage: 'The secondary value is not a number, so it is not compared.',
      }),
    });
  }
  return {
    column: secondary.column,
    ...(label?.visible !== undefined ? { showLabel: label.visible } : {}),
    ...(label?.placement ? { labelPlacement: label.placement } : {}),
    ...(color?.type === 'static' && !compareNode ? { color: fixedColor(color.color) } : {}),
    ...(compareNode ? { compare: compareNode } : {}),
  };
};

const layoutOf = (styling: LensMetricConfig['styling']): MetricNode['layout'] => {
  if (!styling) {
    return undefined;
  }
  const { density, icon, primary, secondary } = styling;
  const glyph = toChartGlyph(icon?.name);
  const layout: NonNullable<MetricNode['layout']> = {
    ...(density ? { density } : {}),
    ...(glyph
      ? { icon: { name: glyph, ...(icon?.alignment ? { alignment: icon.alignment } : {}) } }
      : {}),
    ...(primary?.position ? { valuePosition: primary.position } : {}),
    ...(primary?.labels?.alignment ? { labelsAlignment: primary.labels.alignment } : {}),
    ...(primary?.value?.alignment ? { valueAlignment: primary.value.alignment } : {}),
    ...(primary?.value?.sizing ? { valueSizing: primary.value.sizing } : {}),
    ...(secondary?.value?.alignment ? { secondaryAlignment: secondary.value.alignment } : {}),
  };
  return Object.keys(layout).length > 0 ? layout : undefined;
};

/** A Lens ES|QL metric chart and its query's table, as a `metric` node. */
export const mapLensMetric = (
  chart: LensMetricConfig,
  [queried]: Datatable[],
  kit: MaterializeKit,
  savedObject?: LensSavedObjectReference
): MaterializedNode => {
  const losses: MaterializeLoss[] = [
    ...timeFilterLoss(chart.data_source.query, kit.context, 'data_source'),
  ];
  const primary = chart.metrics.find(isPrimary);
  const secondary = chart.metrics.find(isSecondary);
  if (!primary || !queried) {
    throw new Error('A metric chart needs a primary metric and its table.');
  }
  const { breakdown_by: breakdown, styling } = chart;
  const background = primary.background_chart;
  const primaryIsNumber = findColumn(queried, primary.column).meta.type === 'number';

  // Lens collapses a breakdown only over a numeric value; otherwise the breakdown stays.
  const collapse = primaryIsNumber ? breakdown?.collapse_by : undefined;
  let table = queried;
  if (collapse) {
    const metrics = [
      primary.column,
      secondary?.column,
      background?.type === 'bar' ? background.max_value.column : undefined,
    ].filter((id): id is string => id !== undefined);
    table = collapseTable(queried, [], metrics, collapse);
  }
  const breakdownColumn = collapse ? undefined : breakdown;

  if (!breakdownColumn && table.rows.length > 1) {
    losses.push({
      path: 'data.rows',
      kind: 'dropped',
      note: i18n.translate('xpack.isomer.materialize.lens.metricRows', {
        defaultMessage:
          'Without a breakdown, Kibana shows the first of the {count} rows the query returned.',
        values: { count: table.rows.length },
      }),
    });
    table = { ...table, rows: table.rows.slice(0, 1) };
  }

  const { labels, formats } = collectColumns([
    primary,
    secondary,
    breakdownColumn,
    background?.type === 'bar' ? background.max_value : undefined,
  ]);
  const roles: Record<string, ChartColumnRole> = Object.fromEntries(
    table.columns.map(({ id }) => [id, 'metric' as const])
  );
  if (breakdownColumn) {
    roles[breakdownColumn.column] = 'dimension';
  }
  const { data, losses: dataLosses } = kit.toChartData(applyLensFormats(table, formats), {
    roles,
    labels,
  });
  losses.push(...dataLosses);

  const { color: configuredColor, bandsRange, bands } = primaryColor(primary.color, losses);
  // Lens's default for a numeric value over a bar, which it passes in both color modes.
  const color =
    configuredColor ??
    (background?.type === 'bar' && primaryIsNumber && primary.color?.type !== 'distributed_palette'
      ? fixedColor(euiLightVars.euiColorVis2)
      : undefined);
  if (background?.type === 'trend') {
    losses.push({
      path: 'metrics[0].background_chart',
      kind: 'dropped',
      note: i18n.translate('xpack.isomer.materialize.lens.trend', {
        defaultMessage: 'The trend line Kibana queries separately behind the value is not drawn.',
      }),
    });
  }
  if (bandsRange === 'percentage' && background?.type !== 'bar' && !breakdownColumn) {
    return createUnsupportedNode(
      i18n.translate('xpack.isomer.materialize.lens.percentageBands', {
        defaultMessage: 'Percentage color bands need a maximum or a breakdown.',
      })
    );
  }

  const link = lensLink(savedObject, kit.context);
  const layout = layoutOf(styling);
  const node: MetricNode = {
    type: 'metric',
    ...(chart.title ? { title: chart.title } : {}),
    ...(chart.description ? { description: chart.description } : {}),
    data,
    ...(bands ? { colors: { bands } } : {}),
    value: {
      column: primary.column,
      ...(primary.subtitle ? { subtitle: primary.subtitle } : {}),
      ...(color ? { color } : {}),
      ...(bandsRange ? { bandsRange } : {}),
      ...(primary.apply_color_to ? { applyColorTo: primary.apply_color_to } : {}),
    },
    ...(secondary
      ? {
          secondary: secondaryOf(
            secondary,
            {
              primaryIsNumber,
              secondaryIsNumber: findColumn(table, secondary.column).meta.type === 'number',
            },
            styling,
            losses
          ),
        }
      : {}),
    ...(background?.type === 'bar'
      ? {
          background: {
            kind: 'bar' as const,
            max: background.max_value.column,
            orientation: background.orientation ?? 'vertical',
          },
        }
      : {}),
    ...(breakdownColumn
      ? { breakdown: { column: breakdownColumn.column, maxColumns: breakdownColumn.columns } }
      : {}),
    ...(layout ? { layout } : {}),
    ...(breakdownColumn || link
      ? {
          interactions: {
            ...(breakdownColumn ? { select: ['tile' as const] } : {}),
            ...(link ? { link } : {}),
          },
        }
      : {}),
    ...(losses.length > 0 ? { losses } : {}),
  };
  return node;
};
