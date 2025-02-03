/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Ast } from '@kbn/interpreter';
import { textBasedQueryStateToExpressionAst } from '@kbn/data-plugin/common';
import { ExpressionAstFunction } from '@kbn/expressions-plugin/common';
import { TextBasedPrivateState, TextBasedLayer, IndexPatternRef } from './types';
import type { OriginalColumn } from '../../../common/types';

function getExpressionForLayer(
  layer: TextBasedLayer,
  layerId: string,
  refs: IndexPatternRef[]
): Ast | null {
  if (!layer.columns || layer.columns?.length === 0) {
    return null;
  }

  let idMapper: Record<string, OriginalColumn[]> = {};
  layer.columns.forEach((col) => {
    if (idMapper[col.fieldName]) {
      idMapper[col.fieldName].push({
        id: col.columnId,
        label: col.customLabel ? col.label : col.fieldName,
        variable: col?.variable,
      } as OriginalColumn);
    } else {
      idMapper = {
        ...idMapper,
        [col.fieldName]: [
          {
            id: col.columnId,
            label: col.customLabel ? col.label : col.fieldName,
            variable: col?.variable,
          } as OriginalColumn,
        ],
      };
    }
  });
  const timeFieldName = layer.timeField ?? undefined;

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
    });

    textBasedQueryToAst.chain.push({
      type: 'function',
      function: 'lens_map_to_columns',
      arguments: {
        idMap: [JSON.stringify(idMapper)],
        isTextBased: [true],
      },
    });
    textBasedQueryToAst.chain.push(...formatterOverrides);
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
          },
        },
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
