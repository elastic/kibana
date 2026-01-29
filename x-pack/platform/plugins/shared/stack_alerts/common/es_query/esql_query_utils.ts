/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entries, findLastIndex, isNil } from 'lodash';
import type { ParseAggregationResultsOpts } from '@kbn/triggers-actions-ui-plugin/common';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { ESQLCommandOption } from '@kbn/esql-language';
import {
  type ESQLAstCommand,
  Parser,
  isOptionNode,
  isColumn,
  isFunctionExpression,
} from '@kbn/esql-language';
import { getArgsFromRenameFunction } from '@kbn/esql-utils';
import type { EsqlEsqlShardFailure } from '@elastic/elasticsearch/lib/api/types';
import { ActionGroupId } from './constants';

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
  rows: EsqlDocument[];
  cols: Array<{ id: string; actions: boolean }>;
  // Track duplicate and long alertIds, so we can add a warning
  duplicateAlertIds?: Set<string>;
  longAlertIds?: Set<string>;
}

type EsqlResultRow = Array<string | null>;

const ESQL_DOCUMENT_ID = 'esql_query_document';
const CHUNK_SIZE = 100;

export interface EsqlTable {
  columns: EsqlResultColumn[];
  values: EsqlResultRow[];
  is_partial?: boolean;
  _clusters?: {
    details?: {
      [key: string]: {
        failures?: EsqlEsqlShardFailure[];
      };
    };
  };
}

export const ALERT_ID_COLUMN = 'Alert ID';
export const ALERT_ID_SUGGESTED_MAX = 10;

export const rowToDocument = (columns: EsqlResultColumn[], row: EsqlResultRow): EsqlDocument => {
  const doc: EsqlDocument = {};
  for (let i = 0; i < columns.length; ++i) {
    doc[columns[i].name] = row[i];
  }
  return doc;
};

export const getEsqlQueryHits = async (
  table: EsqlTable,
  query: string,
  isGroupAgg: boolean,
  isPreview: boolean = false
): Promise<EsqlQueryHits> => {
  if (isGroupAgg) {
    const alertIdFields = getAlertIdFields(query, table.columns);
    return await toGroupedEsqlQueryHits(table, alertIdFields, isPreview);
  }
  return await toEsqlQueryHits(table, isPreview);
};

export const toEsqlQueryHits = async (
  table: EsqlTable,
  isPreview: boolean = false,
  chunkSize: number = CHUNK_SIZE
): Promise<EsqlQueryHits> => {
  const hits: EsqlHit[] = [];
  const rows: EsqlDocument[] = [];
  for (let r = 0; r < table.values.length; r++) {
    const row = table.values[r];
    const document = rowToDocument(table.columns, row);
    hits.push({
      _id: ESQL_DOCUMENT_ID,
      _index: '',
      _source: document,
    });
    if (isPreview) {
      rows.push(
        rows.length > 0 ? document : Object.assign({ [ALERT_ID_COLUMN]: ActionGroupId }, document)
      );
    }

    if (r !== 0 && r % chunkSize === 0) {
      await new Promise(setImmediate);
    }
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
    rows,
    cols: isPreview ? getColumnsForPreview(table.columns) : [],
  };
};

export const toGroupedEsqlQueryHits = async (
  table: EsqlTable,
  alertIdFields: string[],
  isPreview: boolean = false,
  chunkSize: number = CHUNK_SIZE
): Promise<EsqlQueryHits> => {
  const duplicateAlertIds: Set<string> = new Set<string>();
  const longAlertIds: Set<string> = new Set<string>();
  const rows: EsqlDocument[] = [];
  const mappedAlertIds: Record<string, Array<string | null>> = {};
  const groupedHits: Record<string, EsqlHit[]> = {};
  for (let r = 0; r < table.values.length; r++) {
    const row = table.values[r];
    const document = rowToDocument(table.columns, row);
    const mappedAlertId = alertIdFields.filter((a) => !isNil(document[a])).map((a) => document[a]);
    if (mappedAlertId.length > 0) {
      const alertId = mappedAlertId.join(',');
      const hit = {
        _id: ESQL_DOCUMENT_ID,
        _index: '',
        _source: document,
      };
      if (groupedHits[alertId]) {
        duplicateAlertIds.add(alertId);
        groupedHits[alertId].push(hit);
      } else {
        groupedHits[alertId] = [hit];
        mappedAlertIds[alertId] = mappedAlertId;
      }

      if (isPreview) {
        rows.push(Object.assign({ [ALERT_ID_COLUMN]: alertId }, document));

        if (mappedAlertId.length >= ALERT_ID_SUGGESTED_MAX) {
          longAlertIds.add(alertId);
        }
      }

      if (r !== 0 && r % chunkSize === 0) {
        await new Promise(setImmediate);
      }
    }
  }

  const aggregations = {
    groupAgg: {
      buckets: entries(groupedHits).map(([key, value]) => {
        return {
          key: mappedAlertIds[key],
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
      termField: alertIdFields,
    },
    duplicateAlertIds,
    longAlertIds,
    rows,
    cols: isPreview ? getColumnsForPreview(table.columns) : [],
  };
};

export const transformToEsqlTable = (datatable: ESQLSearchResponse): EsqlTable => {
  const columns: EsqlResultColumn[] = datatable.columns;
  // Convert each value to string or null to match EsqlResultRow type
  const values: EsqlResultRow[] = datatable.values.map(
    (row) => row.map((v) => (v === null || typeof v === 'string' ? v : String(v))) as EsqlResultRow
  );
  return { columns, values };
};

export const getAlertIdFields = (query: string, resultColumns: EsqlResultColumn[]): string[] => {
  const { root } = Parser.parse(query);
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
    if (isOptionNode(statsArg) && statsArg.name === 'by') {
      return statsArg;
    }
  }
};

const getFields = (option: ESQLCommandOption): string[] => {
  const fields: string[] = [];
  for (const arg of option.args) {
    if (isColumn(arg)) {
      fields.push(arg.name);
    }
  }
  return fields;
};

const getRenameCommands = (commands: ESQLAstCommand[]): ESQLAstCommand[] =>
  commands.filter((c) => c.name === 'rename');

const getFieldsFromRenameCommands = (astCommands: ESQLAstCommand[], fields: string[]): string[] => {
  for (const command of astCommands) {
    for (const renameArg of command.args) {
      if (isFunctionExpression(renameArg)) {
        const { original, renamed } = getArgsFromRenameFunction(renameArg);
        if (isColumn(original) && isColumn(renamed)) {
          fields = fields.map((field) => (field === original.name ? renamed.name : field));
        }
      }
    }
  }
  return fields;
};

const getMetadataOption = (commands: ESQLAstCommand[]): ESQLCommandOption | undefined => {
  const fromCommand = commands.find((c) => c.name === 'from');

  if (fromCommand) {
    for (const fromArg of fromCommand.args) {
      if (isOptionNode(fromArg) && fromArg.name === 'metadata') {
        return fromArg;
      }
    }
  }

  return undefined;
};

const getIdField = (option: ESQLCommandOption): string[] => {
  const fields: string[] = [];
  for (const arg of option.args) {
    if (isColumn(arg) && arg.name === '_id') {
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

const intersection = (fields: string[], columns: string[]): string[] => {
  const columnSet = new Set(columns);
  return fields.filter((item) => columnSet.has(item));
};
