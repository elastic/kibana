/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Ast } from '@kbn/interpreter';
import { textBasedQueryStateToExpressionAst } from '@kbn/data-plugin/common';
import type { ExpressionAstFunction } from '@kbn/expressions-plugin/common';
import type { TextBasedPrivateState, TextBasedLayer, IndexPatternRef } from '@kbn/lens-common';
import type { OriginalColumn } from '@kbn/lens-common';
import { DEFAULT_STATIC_VALUE, ofNameStaticValue, staticValueLabelDefault } from '@kbn/lens-common';
import { isStaticValueColumn, isValidStaticValue } from './utils';

function getExpressionForLayer(
  layer: TextBasedLayer,
  layerId: string,
  refs: IndexPatternRef[]
): Ast | null {
  if (!layer.columns || !Array.isArray(layer.columns) || layer.columns?.length === 0) {
    return null;
  }

  const staticColumns = layer.columns.filter(isStaticValueColumn);
  const queryColumns = layer.columns.filter((column) => !isStaticValueColumn(column));
  if (!staticColumns.length && !queryColumns.length) return null;
  // Mirrors the form-based static_value operation, including its invalid-value fallback.
  const staticExpressions: ExpressionAstFunction[] = staticColumns.map((column) => {
    const value = column.params?.value;
    const isValid = isValidStaticValue(value);
    return {
      type: 'function',
      function: isValid ? 'mathColumn' : 'mapColumn',
      arguments: {
        id: [column.columnId],
        name: [
          !isValid
            ? staticValueLabelDefault
            : column.customLabel && column.label
            ? column.label
            : ofNameStaticValue(value),
        ],
        expression: [isValid ? value : String(DEFAULT_STATIC_VALUE)],
      },
    };
  });
  const formatterOverrides: ExpressionAstFunction[] = layer.columns
    .filter((col) => col.params?.format)
    .map((col) => {
      const format = col.params!.format!;

      const base: ExpressionAstFunction = {
        type: 'function',
        function: 'lens_format_column',
        arguments: {
          format: format ? [format.id] : [''],
          columnId: [col.columnId],
          decimals: typeof format?.params?.decimals === 'number' ? [format.params.decimals] : [],
          suffix:
            format?.params && 'suffix' in format.params && format.params.suffix
              ? [format.params.suffix]
              : [],
          compact:
            format?.params && 'compact' in format.params && format.params.compact
              ? [format.params.compact]
              : [],
          pattern:
            format?.params && 'pattern' in format.params && format.params.pattern
              ? [format.params.pattern]
              : [],
          fromUnit:
            format?.params && 'fromUnit' in format.params && format.params.fromUnit
              ? [format.params.fromUnit]
              : [],
          toUnit:
            format?.params && 'toUnit' in format.params && format.params.toUnit
              ? [format.params.toUnit]
              : [],
          parentFormat: [],
        },
      };

      return base;
    });

  if (!queryColumns.length) {
    return {
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: 'createTable',
          arguments: { ids: [], names: [], rowCount: [1] },
        },
        ...staticExpressions,
        ...formatterOverrides,
      ],
    };
  }

  let idMapper: Record<string, OriginalColumn[]> = {};
  queryColumns.forEach((col) => {
    // Only pick fields that OriginalColumn declares; the Omit<> drops the
    // `interval: never` discriminant that doesn't apply to text-based columns.
    const entry: OriginalColumn = {
      id: col.columnId,
      label: col.customLabel ? col.label ?? col.fieldName : col.fieldName,
      variable: col.variable,
      ...(col.params?.dropPartials !== undefined ? { dropPartials: col.params.dropPartials } : {}),
      format: col.params?.format,
      dataType: col.meta?.type as OriginalColumn['dataType'],
      customLabel: col.customLabel,
      // no operation type for text-based columns
      operationType: undefined,
    };
    if (idMapper[col.fieldName]) {
      idMapper[col.fieldName].push(entry);
    } else {
      idMapper = {
        ...idMapper,
        [col.fieldName]: [entry],
      };
    }
  });
  const timeFieldName = layer.timeField ?? undefined;

  if (!layer.table) {
    const textBasedQueryToAst = textBasedQueryStateToExpressionAst({
      query: layer.query,
      timeFieldName,
      titleForInspector: i18n.translate('xpack.lens.inspectorTextBasedRequestDataTitle', {
        defaultMessage: 'Visualization',
      }),
      descriptionForInspector: i18n.translate('xpack.lens.inspectorTextBasedRequestDescription', {
        defaultMessage:
          'This request queries Elasticsearch to fetch the data for the visualization.',
      }),
      ignoreGlobalFilters: Boolean(layer.ignoreGlobalFilters),
    });

    textBasedQueryToAst.chain.push({
      type: 'function',
      function: 'lens_map_to_columns',
      arguments: {
        idMap: [JSON.stringify(idMapper)],
        isTextBased: [true],
      },
    });
    textBasedQueryToAst.chain.push({
      type: 'function',
      function: 'lens_date_histogram_textbased',
      arguments: {},
    });
    textBasedQueryToAst.chain.push(...staticExpressions, ...formatterOverrides);
    return textBasedQueryToAst;
  } else {
    return {
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: 'var',
          arguments: {
            name: [layerId],
          },
        },
        {
          type: 'function',
          function: 'lens_map_to_columns',
          arguments: {
            idMap: [JSON.stringify(idMapper)],
            isTextBased: [true],
          },
        },
        {
          type: 'function',
          function: 'lens_date_histogram_textbased',
          arguments: {},
        },
        ...staticExpressions,
        ...formatterOverrides,
      ],
    };
  }
}

export function toExpression(state: TextBasedPrivateState, layerId: string) {
  if (state.layers[layerId]) {
    return getExpressionForLayer(state.layers[layerId], layerId, state.indexPatternRefs);
  }

  return null;
}
