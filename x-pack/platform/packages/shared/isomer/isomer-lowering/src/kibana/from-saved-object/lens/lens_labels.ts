/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The labels Lens renders. Its `to_expression` names a column by its label only when that label is custom, and
// otherwise by its operation's `getDefaultLabel` over the layer's columns and the data view, so a saved label can
// be stale ("Top values of x" for a terms column Kibana shows as "Top 1000 values of x"). `@kbn/lens-common` holds
// the default labels of the operations its ES|QL conversion covers; the rest are ported from the Lens plugin's
// operation definitions.

import {
  adjustTimeScaleLabelSuffix,
  type GenericIndexPatternColumn,
  getDefaultLabelFn,
  type IndexPattern,
  LENS_DOCUMENT_FIELD_NAME,
  type TimeScaleUnit,
} from '@kbn/lens-common';

import type { LensState } from './types';

/** A form-based column, as far as its label reads it. */
interface Column {
  label?: string;
  customLabel?: boolean;
  operationType?: string;
  sourceField?: string;
  references?: string[];
  timeScale?: TimeScaleUnit;
  timeShift?: string;
  reducedTimeRange?: string;
  params?: {
    size?: number;
    orderBy?: { type?: string };
    secondaryFields?: string[];
    value?: number;
    formula?: string;
  };
}

const MISSING_FIELD = 'Missing field';
const INCOMPLETE = '(incomplete)';

/** A data view as the default labels read it: a field's display name, its custom label or else its name. */
const indexPatternOf = (fieldLabels: Record<string, string> = {}): IndexPattern =>
  ({
    getFieldByName: (name: string) =>
      // Lens's data views carry a document field, which a count of records names.
      name === LENS_DOCUMENT_FIELD_NAME
        ? { name, displayName: 'Records', type: 'document' }
        : name
        ? {
            name,
            displayName: fieldLabels[name] ?? name,
            ...(fieldLabels[name] ? { customLabel: fieldLabels[name] } : {}),
          }
        : undefined,
  } as unknown as IndexPattern);

const fieldName = (column: Column, indexPattern: IndexPattern) =>
  (indexPattern.getFieldByName(column.sourceField ?? '') as { displayName?: string } | undefined)
    ?.displayName ?? MISSING_FIELD;

const withSuffix = (
  label: string,
  {
    timeScale,
    timeShift,
    reducedTimeRange,
  }: { timeScale?: TimeScaleUnit; timeShift?: string; reducedTimeRange?: string }
) =>
  adjustTimeScaleLabelSuffix(
    label,
    undefined,
    timeScale,
    undefined,
    timeShift,
    undefined,
    reducedTimeRange
  );

/** `terms`'s `ofName`. */
const termsLabel = (column: Column, name: string) => {
  const { params = {} } = column;
  if (params.orderBy?.type === 'rare') return `Rare values of ${name}`;
  if (params.orderBy?.type === 'significant') return `Significant values of ${name}`;
  const others = params.secondaryFields?.length ?? 0;
  if (others) return `Top values of ${name} + ${others} ${others === 1 ? 'other' : 'others'}`;
  const size: number = params.size ?? 0;
  return `Top ${size > 1 ? `${size} ` : ''}${size === 1 ? 'value' : 'values'} of ${name}`;
};

const REFERENCE_LABELS: Record<string, string> = {
  counter_rate: 'Counter rate of',
  cumulative_sum: 'Cumulative sum of',
  differences: 'Differences of',
  moving_average: 'Moving average of',
  overall_sum: 'Overall sum of',
  overall_min: 'Overall min of',
  overall_max: 'Overall max of',
  overall_average: 'Overall average of',
};

/** The label Lens renders for `column`: its custom label, else its operation's default label. */
export const renderedLabel = (
  column: Column,
  columns: Record<string, Column>,
  fieldLabels?: Record<string, string>
): string | undefined => {
  if (column.customLabel) return column.label;
  const indexPattern = indexPatternOf(fieldLabels);
  const registered = column.operationType ? getDefaultLabelFn(column.operationType) : undefined;
  if (registered) {
    return registered(
      column as unknown as GenericIndexPatternColumn,
      columns as unknown as Record<string, GenericIndexPatternColumn>,
      indexPattern
    );
  }
  const reference = (id: string | undefined) =>
    id && columns[id] ? renderedLabel(columns[id]!, columns, fieldLabels) : undefined;
  switch (column.operationType) {
    case 'terms':
      return termsLabel(column, fieldName(column, indexPattern));
    case 'last_value':
      return withSuffix(`Last value of ${fieldName(column, indexPattern)}`, column);
    case 'percentile_rank':
      return withSuffix(
        `Percentile rank (${column.params?.value}) of ${fieldName(column, indexPattern)}`,
        column
      );
    case 'range':
      return fieldName(column, indexPattern);
    case 'filters':
      return 'Filters';
    case 'formula':
      return column.params?.formula ?? 'Formula';
    case 'math':
      return 'Math';
    case 'normalize_by_unit':
      return 'normalize_by_unit';
    case 'counter_rate':
    case 'cumulative_sum': {
      // These name the referenced field, not its column's label.
      const ref = columns[column.references?.[0] ?? ''];
      const name = ref?.sourceField ? fieldName(ref, indexPattern) : INCOMPLETE;
      return withSuffix(`${REFERENCE_LABELS[column.operationType]} ${name}`, {
        ...(column.operationType === 'counter_rate' ? { timeScale: column.timeScale } : {}),
        timeShift: column.timeShift,
      });
    }
    case 'differences':
    case 'moving_average':
      return withSuffix(
        `${REFERENCE_LABELS[column.operationType]} ${
          reference(column.references?.[0]) ?? INCOMPLETE
        }`,
        { timeScale: column.timeScale, timeShift: column.timeShift }
      );
    case 'overall_sum':
    case 'overall_min':
    case 'overall_max':
    case 'overall_average': {
      const ref = columns[column.references?.[0] ?? ''];
      const name = ref?.sourceField ? fieldName(ref, indexPattern) : INCOMPLETE;
      return `${REFERENCE_LABELS[column.operationType]} ${name}`;
    }
    default:
      return undefined;
  }
};

/** `state` with each form-based column labelled as Lens renders it; an operation it doesn't know keeps its label. */
export const withRenderedLabels = (
  state: LensState,
  fieldLabels?: Record<string, string>
): LensState => {
  const relabel = (layers: Record<string, { columns?: Record<string, Column> }> | undefined) =>
    layers &&
    Object.fromEntries(
      Object.entries(layers).map(([layerId, layer]) => {
        const columns = layer.columns ?? {};
        return [
          layerId,
          {
            ...layer,
            columns: Object.fromEntries(
              Object.entries(columns).map(([id, column]) => {
                const label = renderedLabel(column, columns, fieldLabels);
                return [id, label === undefined ? column : { ...column, label }];
              })
            ),
          },
        ];
      })
    );
  const sources = state.datasourceStates as
    | Record<string, { layers?: Record<string, { columns?: Record<string, Column> }> }>
    | undefined;
  if (!sources) return state;
  return {
    ...state,
    datasourceStates: Object.fromEntries(
      Object.entries(sources).map(([key, source]) =>
        key === 'formBased' || key === 'indexpattern'
          ? [key, { ...source, layers: relabel(source.layers) }]
          : [key, source]
      )
    ),
  } as LensState;
};
