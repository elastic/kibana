/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common';
import type {
  OriginalColumn,
  MapToColumnsExpressionFunction,
} from '../../defs/map_to_columns/types';

export const mapToOriginalColumnsTextBased: MapToColumnsExpressionFunction['fn'] = (
  data,
  { idMap: encodedIdMap }
) => {
  const table: Datatable = { ...data };

  if (table && table.columns.length > 2) {
    const dateColumns = table.columns.filter((c) => c.meta.type === 'date');
    const numberColumns = table.columns.filter((c) => c.meta.type === 'number');
    const stringColumns = table.columns.filter((c) => c.meta.type === 'string');

    if (dateColumns.length === 1 && numberColumns.length === 1 && stringColumns.length >= 2) {
      const newColumnName = stringColumns.map((c) => c.name).join(' > ');
      const stringColumnNames = stringColumns.map((c) => c.name);

      table.rows = table.rows.map((row) => {
        const newRow = { ...row };
        newRow[newColumnName] = stringColumnNames.map((name) => row[name] ?? '(empty)').join(' > ');
        stringColumnNames.forEach((name) => {
          delete newRow[name];
        });
        return newRow;
      });

      table.columns = [
        ...dateColumns,
        ...numberColumns,
        {
          id: newColumnName,
          name: newColumnName,
          meta: { type: 'string', esqlType: 'keyword' },
        },
      ];
    }
  }

  const isOriginalColumn = (item: OriginalColumn | undefined): item is OriginalColumn => {
    return !!item;
  };
  const idMap = JSON.parse(encodedIdMap) as Record<string, OriginalColumn[]>;

  // extract all the entries once
  const idMapColEntries = Object.entries(idMap);
  // create a lookup id => column
  const colLookups = new Map<string, DatatableColumn>(table.columns.map((c) => [c.id, c]));

  // now create a lookup to get the original columns for each variable
  const colVariableLookups = new Map<string, OriginalColumn[]>(
    idMapColEntries.flatMap(([id, columns]) =>
      columns.filter(({ variable }) => variable).map(({ variable }) => [`${variable}`, columns])
    )
  );

  return {
    ...table,
    rows: table.rows.map((row) => {
      const mappedRow: Record<string, unknown> = {};

      for (const id in row) {
        if (id in idMap) {
          for (const cachedEntry of idMap[id]) {
            mappedRow[cachedEntry.id] = row[id];
          }
        } else {
          const col = colLookups.get(id);
          if (col?.variable) {
            const originalColumn = colVariableLookups.get(col.variable);
            if (originalColumn) {
              for (const cachedEntry of originalColumn) {
                mappedRow[cachedEntry.id] = row[id];
              }
            }
          }
        }
      }

      return mappedRow;
    }),
    columns: table.columns.flatMap((column) => {
      if (!(column.id in idMap) && !column.variable) {
        return [];
      }
      if (column.variable) {
        const originalColumn = idMapColEntries
          .map(([_id, columns]) => columns.find((c) => c.variable === column.variable))
          .filter(isOriginalColumn);

        if (!originalColumn) {
          return [];
        }

        return originalColumn.map((c) => ({ ...column, id: c.id }));
      }
      return idMap[column.id].map((originalColumn) => ({
        ...column,
        id: originalColumn.id,
        name: originalColumn.label,
        meta: {
          ...column.meta,
          ...('sourceField' in originalColumn ? { field: originalColumn.sourceField } : {}),
          ...('format' in originalColumn ? { params: originalColumn.format } : {}),
          sourceParams: {
            ...(column.meta?.sourceParams ?? {}),
            ...('sourceField' in originalColumn ? { sourceField: originalColumn.sourceField } : {}),
            ...('operationType' in originalColumn
              ? { operationType: originalColumn.operationType }
              : {}),
            ...('interval' in originalColumn ? { interval: originalColumn.interval } : {}),
            ...('params' in originalColumn
              ? {
                  params: {
                    ...(originalColumn.params as object),
                    used_interval: `${originalColumn.interval}ms`,
                  },
                }
              : {}),
          },
        },
      }));
    }),
  };
};
