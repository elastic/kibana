/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { supportedFormats } from './supported_formats';
import type { FormatColumnArgs } from '.';
import type { FormatColumnExpressionFunction } from './types';

function isNestedFormat(params: DatatableColumn['meta']['params']) {
  // if there is a nested params object with an id, it's a nested format
  // suffix formatters do not count as nested
  return !!params?.params?.id && params.id !== 'suffix';
}

function withParams(col: DatatableColumn, params: Record<string, unknown>) {
  return { ...col, meta: { ...col.meta, params } };
}

function getSafeFormatId(format: string) {
  return supportedFormats[format].formatId !== 'custom'
    ? supportedFormats[format].formatId
    : 'number';
}

function getPatternFromFormat(
  format: string,
  decimals: number | undefined,
  compact: boolean | undefined,
  pattern: string | undefined
) {
  const basePattern = supportedFormats[format].decimalsToPattern(decimals, compact);
  if (supportedFormats[format].formatId === 'custom') {
    return pattern ?? basePattern;
  }
  return basePattern;
}

export const formatColumnFn: FormatColumnExpressionFunction['fn'] = (
  input,
  {
    format,
    columnId,
    decimals,
    compact,
    suffix,
    pattern,
    parentFormat,
    ...otherArgs
  }: FormatColumnArgs
) => ({
  ...input,
  columns: input.columns
    .map((col) => {
      if (col.id === columnId) {
        if (!parentFormat) {
          if (supportedFormats[format]) {
            const serializedFormat: SerializedFieldFormat = {
              // Lens custom formatter is still a number format, different from the Kibana custom one
              id: getSafeFormatId(format),
              params: {
                pattern: getPatternFromFormat(format, decimals, compact, pattern),
                formatOverride: true,
                ...supportedFormats[format].translateToFormatParams?.({
                  decimals,
                  compact,
                  suffix,
                  ...otherArgs,
                }),
              },
            };
            return withParams(col, serializedFormat as Record<string, unknown>);
          } else if (format) {
            return withParams(col, { id: format });
          } else {
            return col;
          }
        }

        const parsedParentFormat = JSON.parse(parentFormat);
        const parentFormatId = parsedParentFormat.id;
        const parentFormatParams = parsedParentFormat.params ?? {};

        // Be careful here to check for undefined custom format
        const isDuplicateParentFormatter = parentFormatId === col.meta.params?.id && format == null;
        if (!parentFormatId || isDuplicateParentFormatter) {
          return col;
        }

        if (format && supportedFormats[format]) {
          const customParams = {
            pattern: getPatternFromFormat(format, decimals, compact, pattern),
            formatOverride: true,
            ...supportedFormats[format].translateToFormatParams?.({
              decimals,
              compact,
              suffix,
              ...otherArgs,
            }),
          };
          // Some parent formatters are multi-fields and wrap the custom format into a "paramsPerField"
          // property. Here the format is passed to this property to make it work properly
          if ((col.meta.params?.params?.paramsPerField as SerializedFieldFormat[])?.length) {
            return withParams(col, {
              id: parentFormatId,
              params: {
                ...col.meta.params?.params,
                id: getSafeFormatId(format),
                ...parentFormatParams,
                // some wrapper formatters require params to be flatten out (i.e. terms) while others
                // require them to be in the params property (i.e. ranges)
                // so for now duplicate
                paramsPerField: (
                  col.meta.params?.params?.paramsPerField as SerializedFieldFormat[]
                ).map((f) => ({
                  ...f,
                  params: { ...f.params, ...customParams },
                  ...customParams,
                })),
              },
            });
          }
          return withParams(col, {
            id: parentFormatId,
            params: {
              ...col.meta.params?.params,
              id: getSafeFormatId(format),
              // some wrapper formatters require params to be flatten out (i.e. terms) while others
              // require them to be in the params property (i.e. ranges)
              // so for now duplicate
              ...customParams,
              params: customParams,
              ...parentFormatParams,
            },
          });
        }
        if (parentFormatParams) {
          // if original format is already a nested one, we are just replacing the wrapper params
          // otherwise wrapping it inside parentFormatId/parentFormatParams
          const isNested = isNestedFormat(col.meta.params);
          const innerParams = isNested
            ? col.meta.params?.params
            : { id: col.meta.params?.id, params: col.meta.params?.params };

          const formatId = isNested ? col.meta.params?.id : parentFormatId;

          return withParams(col, {
            ...col.meta.params,
            id: formatId,
            params: {
              ...innerParams,
              ...parentFormatParams,
            },
          });
        }
      }
      return col;
    })
    .map((col) => {
      if (!suffix) return col;
      if (col.id !== columnId) return col;
      if (!col.meta.params) return col;
      return {
        ...col,
        meta: {
          ...col.meta,
          params: {
            id: 'suffix',
            params: {
              ...col.meta.params,
              suffixString: suffix,
              formatOverride: true,
            },
          },
        },
      };
    }),
});
