/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { AggFunctionsMapping, UI_SETTINGS } from '@kbn/data-plugin/public';
import { extendedBoundsToAst, numericalRangeToAst } from '@kbn/data-plugin/common';
import { buildExpressionFunction, Range } from '@kbn/expressions-plugin/public';
import { RangeEditor } from './range_editor';
import { OperationDefinition } from '..';
import { FieldBasedIndexPatternColumn } from '../column_types';
import { updateColumnParam } from '../../layer_helpers';
import { supportedFormats } from '../../../../../../common/expressions/format_column/supported_formats';
import { MODES, AUTO_BARS, DEFAULT_INTERVAL, MIN_HISTOGRAM_BARS, SLICES } from './constants';
import { IndexPattern, IndexPatternField } from '../../../../../types';
import { getInvalidFieldMessage, isValidNumber } from '../helpers';

type RangeType = Omit<Range, 'type'>;
// Try to cover all possible serialized states for ranges
export type RangeTypeLens = (RangeType | { from: Range['from'] | null; to: Range['to'] | null }) & {
  label: string;
};

// This is a subset of RangeTypeLens which has both from and to defined
type FullRangeTypeLens = Extract<RangeTypeLens, NonNullable<RangeType>>;

export type MODES_TYPES = (typeof MODES)[keyof typeof MODES];

export interface RangeIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: 'range';
  params: {
    type: MODES_TYPES;
    maxBars: typeof AUTO_BARS | number;
    ranges: RangeTypeLens[];
    format?: { id: string; params?: { decimals: number } };
    includeEmptyRows?: boolean;
    parentFormat?: {
      id: string;
      params?: { id?: string; template?: string; replaceInfinity?: boolean };
    };
  };
}

export type RangeColumnParams = RangeIndexPatternColumn['params'];
export type UpdateParamsFnType = <K extends keyof RangeColumnParams>(
  paramName: K,
  value: RangeColumnParams[K]
) => void;

export const isRangeWithin = (range: RangeType): boolean => range.from <= range.to;
const isFullRange = (range: RangeTypeLens): range is FullRangeTypeLens =>
  isValidNumber(range.from) && isValidNumber(range.to);
export const isValidRange = (range: RangeTypeLens): boolean => {
  if (isFullRange(range)) {
    return isRangeWithin(range);
  }
  return true;
};

function getFieldDefaultFormat(indexPattern: IndexPattern, field: IndexPatternField | undefined) {
  if (field) {
    if (indexPattern.fieldFormatMap && indexPattern.fieldFormatMap[field.name]) {
      return indexPattern.fieldFormatMap[field.name];
    }
  }
  return undefined;
}

export const rangeOperation: OperationDefinition<
  RangeIndexPatternColumn,
  'field',
  RangeColumnParams
> = {
  type: 'range',
  displayName: i18n.translate('xpack.lens.indexPattern.intervals', {
    defaultMessage: 'Intervals',
  }),
  priority: 4, // Higher than terms, so numbers get histogram
  input: 'field',
  getErrorMessage: (layer, columnId, indexPattern) =>
    getInvalidFieldMessage(layer, columnId, indexPattern),
  getPossibleOperationForField: ({ aggregationRestrictions, aggregatable, type }) => {
    if (
      type === 'number' &&
      aggregatable &&
      (!aggregationRestrictions || aggregationRestrictions.range)
    ) {
      return {
        dataType: 'number',
        isBucketed: true,
        scale: 'interval',
      };
    }
  },
  getDefaultLabel: (column, columns, indexPattern) =>
    indexPattern?.getFieldByName(column.sourceField)?.displayName ??
    i18n.translate('xpack.lens.indexPattern.missingFieldLabel', {
      defaultMessage: 'Missing field',
    }),
  buildColumn({ field }, columnParams) {
    const type = columnParams?.type ?? MODES.Histogram;
    return {
      label: field.displayName,
      dataType: type === MODES.Histogram ? 'number' : 'string', // string for Range
      operationType: 'range',
      sourceField: field.name,
      isBucketed: true,
      scale: type === MODES.Histogram ? 'interval' : 'ordinal', // ordinal for Range
      params: {
        includeEmptyRows: columnParams?.includeEmptyRows ?? true,
        type: columnParams?.type ?? MODES.Histogram,
        ranges: columnParams?.ranges ?? [{ from: 0, to: DEFAULT_INTERVAL, label: '' }],
        maxBars: columnParams?.maxBars ?? AUTO_BARS,
        format: columnParams?.format,
        parentFormat: columnParams?.parentFormat,
      },
    };
  },
  isTransferable: (column, newIndexPattern) => {
    const newField = newIndexPattern.getFieldByName(column.sourceField);

    return Boolean(
      newField &&
        newField.type === 'number' &&
        newField.aggregatable &&
        (!newField.aggregationRestrictions || newField.aggregationRestrictions.range)
    );
  },
  onFieldChange: (oldColumn, field) => {
    return {
      ...oldColumn,
      label: field.name,
      sourceField: field.name,
    };
  },
  toESQL: (column, columnId, _indexPattern, layer, uiSettings) => {
    return undefined;
  },
  toEsAggsFn: (column, columnId, indexPattern, layer, uiSettings) => {
    const { sourceField, params } = column;
    if (params.type === MODES.Range) {
      return buildExpressionFunction<AggFunctionsMapping['aggRange']>('aggRange', {
        id: columnId,
        enabled: true,
        schema: 'segment',
        field: sourceField,
        ranges: params.ranges
          .filter(isValidRange)
          .map<Partial<RangeType>>((range) => {
            if (isFullRange(range)) {
              return range;
            }
            const partialRange: Partial<RangeType> = { label: range.label };
            // be careful with the fields to set on partial ranges
            if (isValidNumber(range.from)) {
              partialRange.from = Number(range.from);
            }
            if (isValidNumber(range.to)) {
              partialRange.to = Number(range.to);
            }
            return partialRange;
          })
          .map(numericalRangeToAst),
      }).toAst();
    }
    const maxBarsDefaultValue =
      (uiSettings.get(UI_SETTINGS.HISTOGRAM_MAX_BARS) - MIN_HISTOGRAM_BARS) / 2;

    return buildExpressionFunction<AggFunctionsMapping['aggHistogram']>('aggHistogram', {
      id: columnId,
      enabled: true,
      schema: 'segment',
      field: sourceField,
      maxBars: params.maxBars === AUTO_BARS ? maxBarsDefaultValue : params.maxBars,
      interval: 'auto',
      has_extended_bounds: false,
      min_doc_count: Boolean(params.includeEmptyRows),
      autoExtendBounds: Boolean(params.includeEmptyRows),
      extended_bounds: extendedBoundsToAst({}),
    }).toAst();
  },
  paramEditor: ({
    layer,
    columnId,
    currentColumn,
    paramEditorUpdater,
    indexPattern,
    uiSettings,
    fieldFormats,
  }) => {
    const currentField = indexPattern.getFieldByName(currentColumn.sourceField);
    const numberFormat = currentColumn.params.format;
    const numberFormatterPattern =
      numberFormat &&
      supportedFormats[numberFormat.id] &&
      supportedFormats[numberFormat.id].decimalsToPattern(numberFormat.params?.decimals || 0);
    const numberFormatId = numberFormat && supportedFormats[numberFormat.id].formatId;

    const rangeFormatter = fieldFormats.deserialize({
      ...(currentColumn.params.parentFormat || { id: 'range' }),
      params: {
        ...currentColumn.params.parentFormat?.params,
        ...(numberFormat
          ? { id: numberFormatId, params: { pattern: numberFormatterPattern } }
          : getFieldDefaultFormat(indexPattern, currentField)),
      },
    });

    const MAX_HISTOGRAM_BARS = uiSettings.get(UI_SETTINGS.HISTOGRAM_MAX_BARS);
    const granularityStep = (MAX_HISTOGRAM_BARS - MIN_HISTOGRAM_BARS) / SLICES;
    const maxBarsDefaultValue = (MAX_HISTOGRAM_BARS - MIN_HISTOGRAM_BARS) / 2;

    // Used to change one param at the time
    const setParam: UpdateParamsFnType = (paramName, value) => {
      paramEditorUpdater(
        updateColumnParam({
          layer,
          columnId,
          paramName,
          value,
        })
      );
    };

    // Useful to change more params at once
    const onChangeMode = (newMode: MODES_TYPES) => {
      const scale = newMode === MODES.Range ? 'ordinal' : 'interval';
      const dataType = newMode === MODES.Range ? 'string' : 'number';
      const parentFormat =
        newMode === MODES.Range
          ? { id: 'range', params: { template: 'arrow_right', replaceInfinity: true } }
          : undefined;
      paramEditorUpdater({
        ...layer,
        columns: {
          ...layer.columns,
          [columnId]: {
            ...currentColumn,
            scale,
            dataType,
            params: {
              type: newMode,
              ranges: [{ from: 0, to: DEFAULT_INTERVAL, label: '' }],
              maxBars: maxBarsDefaultValue,
              format: currentColumn.params.format,
              parentFormat,
            },
          } as RangeIndexPatternColumn,
        },
      });
    };
    return (
      <RangeEditor
        setParam={setParam}
        maxBars={
          currentColumn.params.maxBars === AUTO_BARS
            ? maxBarsDefaultValue
            : currentColumn.params.maxBars
        }
        granularityStep={granularityStep}
        params={currentColumn.params}
        onChangeMode={onChangeMode}
        maxHistogramBars={uiSettings.get(UI_SETTINGS.HISTOGRAM_MAX_BARS)}
        rangeFormatter={rangeFormatter}
      />
    );
  },
  quickFunctionDocumentation: i18n.translate('xpack.lens.indexPattern.ranges.documentation.quick', {
    defaultMessage: `
    Buckets values along defined numeric ranges.
      `,
  }),
};
