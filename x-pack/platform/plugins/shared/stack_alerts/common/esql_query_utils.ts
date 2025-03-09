/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entries, findLastIndex, intersection } from 'lodash';
import { Datatable } from '@kbn/expressions-plugin/common';
import { ParseAggregationResultsOpts } from '@kbn/triggers-actions-ui-plugin/common';
import { type ESQLAstCommand, parse, ESQLCommandOption } from '@kbn/esql-ast';
import { isOptionItem, isColumnItem } from '@kbn/esql-validation-autocomplete';

type EsqlDocument = Record<string, string | null>;

interface EsqlHit {
  _id: string;
  _index: string;
  _source: EsqlDocument;
}

interface EsqlResultColumn {
  name: string;
  type: string;
}

interface EsqlQueryHits {
  results: ParseAggregationResultsOpts;
  duplicateAlertIds: Set<string>;
  rows: EsqlDocument[];
  cols: Array<{ id: string; actions: boolean }>;
}

type EsqlResultRow = Array<string | null>;

const ESQL_DOCUMENT_ID = 'esql_query_document';

export interface EsqlTable {
  columns: EsqlResultColumn[];
  values: EsqlResultRow[];
}

export const ALERT_ID_COLUMN = 'Alert ID';

export const rowToDocument = (columns: EsqlResultColumn[], row: EsqlResultRow): EsqlDocument => {
  return columns.reduce<Record<string, string | null>>((acc, column, i) => {
    acc[column.name] = row[i];

    return acc;
  }, {});
};

export const getEsqlQueryHits = (
  table: EsqlTable,
  query: string,
  isGroupAgg: boolean
): EsqlQueryHits => {
  if (isGroupAgg) {
    const alertId = getAlertId(query, table.columns);
    return toGroupedEsqlQueryHits(table, alertId);
  }
  return toEsqlQueryHits(table);
};

export const toEsqlQueryHits = (table: EsqlTable): EsqlQueryHits => {
  const hits: EsqlHit[] = [];
  const rows: EsqlDocument[] = [];
  for (const row of table.values) {
    const document = rowToDocument(table.columns, row);
    hits.push({
      _id: ESQL_DOCUMENT_ID,
      _index: '',
      _source: document,
    });
    rows.push(rows.length > 0 ? document : { [ALERT_ID_COLUMN]: 'query matched', ...document });
  }

  return {
    results: {
      isCountAgg: true,
      isGroupAgg: false,
      esResult: {
        took: 0,
        timed_out: false,
        _shards: { failed: 0, successful: 0, total: 0 },
        hits: {
          hits,
          total: hits.length,
        },
      },
    },
    duplicateAlertIds: new Set<string>(),
    rows,
    cols: getColumnsForPreview(table.columns),
  };
};

export const toGroupedEsqlQueryHits = (table: EsqlTable, alertId: string[]): EsqlQueryHits => {
  const duplicateAlertIds: Set<string> = new Set<string>();
  const rows: EsqlDocument[] = [];
  const groupedHits = table.values.reduce<Record<string, EsqlHit[]>>((acc, row) => {
    const document = rowToDocument(table.columns, row);
    const id = alertId.map((a) => document[a] ?? 'undefined').join(',');
    const hit = {
      _id: ESQL_DOCUMENT_ID,
      _index: '',
      _source: document,
    };
    if (acc[id]) {
      duplicateAlertIds.add(id);
      acc[id].push(hit);
    } else {
      acc[id] = [hit];
    }
    rows.push({ [ALERT_ID_COLUMN]: id, ...document });
    return acc;
  }, {});

  const aggregations = {
    groupAgg: {
      buckets: entries(groupedHits).map(([key, value]) => {
        return {
          key,
          doc_count: value.length,
          topHitsAgg: {
            hits: {
              hits: value,
            },
          },
        };
      }),
    },
  };

  return {
    results: {
      isCountAgg: false,
      isGroupAgg: true,
      esResult: {
        took: 0,
        timed_out: false,
        _shards: { failed: 0, successful: 0, total: 0 },
        hits: { hits: [] },
        aggregations,
      },
    },
    duplicateAlertIds,
    rows,
    cols: getColumnsForPreview(table.columns),
  };
};

export const transformDatatableToEsqlTable = (datatable: Datatable): EsqlTable => {
  const columns: EsqlResultColumn[] = datatable.columns.map((c) => ({
    name: c.id,
    type: c.meta.type,
  }));
  const values: EsqlResultRow[] = datatable.rows.map((r) => Object.values(r));
  return { columns, values };
};

export const getAlertId = (query: string, resultColumns: EsqlResultColumn[]): string[] => {
  const { root } = parse(query);
  const commands = root.commands;
  const columns = resultColumns.map((c) => c.name);

  // Check for STATS command
  const statsCommandIndex = getLastStatsCommandIndex(commands);
  if (statsCommandIndex > -1) {
    const statsCommand = commands[statsCommandIndex];
    // Check for BY option and get fields
    const byOption = getByOption(statsCommand);
    if (byOption) {
      let fields = getFields(byOption);

      // Check if any STATS fields were renamed
      const renameCommands = getRenameCommands(commands.slice(statsCommandIndex));
      if (renameCommands.length > 0) {
        fields = getFieldsFromRenameCommands(renameCommands, fields);
      }

      // Check if any fields were dropped
      fields = intersection(fields, columns);
      if (fields.length > 0) {
        return fields;
      }
    }
  }

  // Check for METADATA _id
  const metadataOption = getMetadataOption(commands);
  if (metadataOption) {
    const fields = getIdField(metadataOption);

    // Check if _id was dropped
    if (intersection(fields, columns).length > 0) {
      return fields;
    }
  }

  // Return all columns
  return columns;
};

const getLastStatsCommandIndex = (commands: ESQLAstCommand[]): number =>
  findLastIndex(commands, (c) => c.name === 'stats');

const getByOption = (astCommand: ESQLAstCommand): ESQLCommandOption | undefined => {
  for (const statsArg of astCommand.args) {
    if (isOptionItem(statsArg) && statsArg.name === 'by') {
      return statsArg;
    }
  }
};

const getFields = (option: ESQLCommandOption): string[] => {
  const fields: string[] = [];
  for (const arg of option.args) {
    if (isColumnItem(arg)) {
      fields.push(arg.name);
    }
  }
  return fields;
};

const getRenameCommands = (commands: ESQLAstCommand[]): ESQLAstCommand[] =>
  commands.filter((c) => c.name === 'rename');

const getFieldsFromRenameCommands = (astCommands: ESQLAstCommand[], fields: string[]): string[] => {
  return astCommands.reduce((updatedFields, command) => {
    for (const renameArg of command.args) {
      if (isOptionItem(renameArg) && renameArg.name === 'as') {
        const [original, renamed] = renameArg.args;
        if (isColumnItem(original) && isColumnItem(renamed)) {
          updatedFields = updatedFields.map((field) =>
            field === original.name ? renamed.name : field
          );
        }
      }
    }
    return updatedFields;
  }, fields);
};

const getMetadataOption = (commands: ESQLAstCommand[]): ESQLCommandOption | undefined => {
  const fromCommand = commands.find((c) => c.name === 'from');

  if (fromCommand) {
    for (const fromArg of fromCommand.args) {
      if (isOptionItem(fromArg) && fromArg.name === 'metadata') {
        return fromArg;
      }
    }
  }

  return undefined;
};

const getIdField = (option: ESQLCommandOption): string[] => {
  const fields: string[] = [];
  for (const arg of option.args) {
    if (isColumnItem(arg) && arg.name === '_id') {
      fields.push(arg.name);
      return fields;
    }
  }
  return fields;
};

const getColumnsForPreview = (
  columns: EsqlResultColumn[]
): Array<{ id: string; actions: boolean }> => {
  const cols = [{ id: ALERT_ID_COLUMN, actions: false }];
  for (const c of columns) {
    cols.push({ id: c.name, actions: false });
  }
  return cols;
};
