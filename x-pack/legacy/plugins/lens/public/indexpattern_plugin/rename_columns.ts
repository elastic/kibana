/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  ExpressionFunction,
  KibanaDatatable,
  KibanaDatatableColumn,
} from 'src/plugins/expressions/common';
import { IndexPatternColumn } from './operations';

interface RemapArgs {
  idMap: string;
}

export type OriginalColumn = { id: string } & IndexPatternColumn;

export const renameColumns: ExpressionFunction<
  'lens_rename_columns',
  KibanaDatatable,
  RemapArgs,
  KibanaDatatable
> = {
  name: 'lens_rename_columns',
  type: 'kibana_datatable',
  help: i18n.translate('xpack.lens.functions.renameColumns.help', {
    defaultMessage: 'A helper to rename the columns of a datatable',
  }),
  args: {
    idMap: {
      types: ['string'],
      help: i18n.translate('xpack.lens.functions.renameColumns.idMap.help', {
        defaultMessage:
          'A JSON encoded object in which keys are the old column ids and values are the corresponding new ones. All other columns ids are kept.',
      }),
    },
  },
  context: {
    types: ['kibana_datatable'],
  },
  fn(data: KibanaDatatable, { idMap: encodedIdMap }: RemapArgs) {
    const idMap = JSON.parse(encodedIdMap) as Record<string, OriginalColumn>;

    return {
      type: 'kibana_datatable',
      rows: data.rows.map(row => {
        const mappedRow: Record<string, unknown> = {};
        Object.entries(idMap).forEach(([fromId, toId]) => {
          mappedRow[toId.id] = row[fromId];
        });

        Object.entries(row).forEach(([id, value]) => {
          if (id in idMap) {
            mappedRow[idMap[id].id] = sanitizeValue(value);
          } else {
            mappedRow[id] = sanitizeValue(value);
          }
        });

        return mappedRow;
      }),
      columns: data.columns.map(column => {
        const mappedItem = idMap[column.id];

        if (!mappedItem) {
          return column;
        }

        return {
          ...column,
          id: mappedItem.id,
          name: getColumnName(mappedItem, column),
        };
      }),
    };
  },
};

function getColumnName(originalColumn: OriginalColumn, newColumn: KibanaDatatableColumn) {
  if (originalColumn && originalColumn.operationType === 'date_histogram') {
    const fieldName = originalColumn.sourceField;

    // HACK: This is a hack, and introduces some fragility into
    // column naming. Eventually, this should be calculated and
    // built more systematically.
    return newColumn.name.replace(fieldName, originalColumn.label);
  }

  return originalColumn.label;
}

function sanitizeValue(value: unknown) {
  if (value === '') {
    return i18n.translate('xpack.lens.indexpattern.emptyTextColumnValue', {
      defaultMessage: '(empty)',
    });
  }

  return value;
}
