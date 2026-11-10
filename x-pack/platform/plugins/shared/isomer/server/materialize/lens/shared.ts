/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common';
import { parseTimeFieldFromESQLQuery } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import type { ChartGlyph } from '@kbn/isomer';
import { CHART_GLYPHS } from '@kbn/isomer';
import rison from '@kbn/rison';
import type { MaterializeContext } from '../../../common';
import type { MaterializeLoss } from '../nodes';
import type { ConcreteColor } from '../kit/colors';
import { toHexColor } from '../kit/colors';
import type { LensApiFormat, LensSavedObjectReference } from './types';

/** The column a Lens API config names, in the table its query returned. */
export const findColumn = (table: Datatable, name: string): DatatableColumn => {
  const column = table.columns.find(({ id }) => id === name);
  if (!column) {
    throw new Error(
      i18n.translate('xpack.isomer.materialize.lens.missingColumn', {
        defaultMessage: 'The query returned no "{name}" column.',
        values: { name },
      })
    );
  }
  return column;
};

/** A column a chart dimension reads: its name, and the label and format the config gives it. */
export interface LensColumnRef {
  column: string;
  label?: string;
  format?: LensApiFormat;
}

/** Each referenced column's label and format, keyed by column, first reference winning. */
export const collectColumns = (
  refs: Array<LensColumnRef | undefined>
): { labels: Record<string, string>; formats: Map<string, LensApiFormat> } => {
  const labels: Record<string, string> = {};
  const formats = new Map<string, LensApiFormat>();
  for (const ref of refs) {
    if (!ref) {
      continue;
    }
    if (ref.label !== undefined && labels[ref.column] === undefined) {
      labels[ref.column] = ref.label;
    }
    if (ref.format && !formats.has(ref.column)) {
      formats.set(ref.column, ref.format);
    }
  }
  return { labels, formats };
};

/** A color the config writes once, used in both color schemes. */
export const fixedColor = (color: string): ConcreteColor => {
  const hex = toHexColor(color);
  return { light: hex, dark: hex };
};

export const openInLensLabel = (): string =>
  i18n.translate('xpack.isomer.materialize.lens.openInLens', {
    defaultMessage: 'Open in Lens',
  });

/** The link back to a saved Lens chart, opening it on the time range the node was queried for. */
export const lensLink = (
  savedObject: LensSavedObjectReference | undefined,
  { timeRange }: MaterializeContext
): { href: string; label: string } | undefined => {
  if (!savedObject) {
    return undefined;
  }
  const time = timeRange
    ? `?_g=${rison.encode({ time: { from: timeRange.from, to: timeRange.to } })}`
    : '';
  return {
    href: `${savedObject.path}${time}`,
    label: openInLensLabel(),
  };
};

/**
 * A loss when Lens would filter a query by time and materialization can't: Lens filters a query
 * without `?_tstart`/`?_tend` on `@timestamp` when every index it reads has one, which only the
 * browser checks.
 */
export const timeFilterLoss = (
  query: string,
  { timeRange }: MaterializeContext,
  path: string
): MaterializeLoss[] =>
  timeRange && !parseTimeFieldFromESQLQuery(query)
    ? [
        {
          path,
          kind: 'approximated',
          note: i18n.translate('xpack.isomer.materialize.lens.noTimeField', {
            defaultMessage:
              'The query does not use ?_tstart or ?_tend, so the time range does not filter it. Kibana may filter it on @timestamp.',
          }),
        },
      ]
    : [];

// Lens icons with no glyph of the same name or EUI icon type, mapped to the glyph that shows them.
const LENS_ICON_GLYPHS: Record<string, ChartGlyph> = { popout: 'external' };

const isGlyph = (name: string): name is ChartGlyph => Object.hasOwn(CHART_GLYPHS, name);

/**
 * The chart glyph a Lens API icon name, such as `map_marker`, draws: the glyph of that name, or
 * the one drawn by default as that EUI icon type (elastic/isomer#361). Undefined if there is none.
 */
export const toChartGlyph = (icon: string | undefined): ChartGlyph | undefined => {
  if (!icon) {
    return undefined;
  }
  const euiType = icon.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
  if (isGlyph(euiType)) {
    return euiType;
  }
  const byEuiType = (Object.keys(CHART_GLYPHS) as ChartGlyph[]).find(
    (glyph) => (CHART_GLYPHS[glyph] as { eui?: string }).eui === euiType
  );
  return byEuiType ?? LENS_ICON_GLYPHS[euiType];
};

// Fixed widths, as Elastic Charts' `minInterval` and Isomer's `axes.x.interval` take them: a month
// is 30 days and a year 365.
const ESQL_UNIT_MS: Record<string, number> = {
  millisecond: 1,
  second: 1000,
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
  week: 7 * 86_400_000,
  month: 30 * 86_400_000,
  quarter: 91 * 86_400_000,
  year: 365 * 86_400_000,
};

/**
 * The bucket width of an x column, in x units (milliseconds for dates), from the `BUCKET` an
 * ES|QL query built it with, as Lens's `calculateMinInterval` reads it. Undefined when the column
 * wasn't bucketed or its unit is unknown.
 */
export const bucketInterval = (column: DatatableColumn | undefined): number | undefined => {
  const bucket = column?.meta.esMeta?.bucket as { interval?: unknown; unit?: unknown } | undefined;
  if (typeof bucket?.interval !== 'number' || !(bucket.interval > 0)) {
    return undefined;
  }
  if (column?.meta.type === 'date') {
    const unit = typeof bucket.unit === 'string' ? ESQL_UNIT_MS[bucket.unit] : undefined;
    return unit ? bucket.interval * unit : undefined;
  }
  return bucket.unit ? undefined : bucket.interval;
};
