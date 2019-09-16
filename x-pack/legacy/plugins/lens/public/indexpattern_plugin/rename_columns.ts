/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunction, KibanaDatatable } from 'src/legacy/core_plugins/interpreter/public';

interface RemapArgs {
  idMap: string;
}

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
    const idMap = JSON.parse(encodedIdMap) as Record<string, string>;
    return {
      type: 'kibana_datatable',
      rows: data.rows.map(row => {
        const mappedRow: Record<string, unknown> = {};
        Object.entries(idMap).forEach(([fromId, toId]) => {
          mappedRow[toId] = row[fromId];
        });

        Object.entries(row).forEach(([id, value]) => {
          if (id in idMap) {
            mappedRow[idMap[id]] = value;
          } else {
            mappedRow[id] = value;
          }
        });

        return mappedRow;
      }),
      columns: data.columns.map(column => ({
        ...column,
        id: idMap[column.id] ? idMap[column.id] : column.id,
      })),
    };
  },
};
