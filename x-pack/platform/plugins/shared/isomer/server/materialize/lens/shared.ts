/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common';
import { parseTimeFieldFromESQLQuery } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
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
