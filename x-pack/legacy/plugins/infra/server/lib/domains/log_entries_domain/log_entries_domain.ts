/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import stringify from 'json-stable-stringify';
import { sortBy } from 'lodash';

import { TimeKey } from '../../../../common/time';
import { JsonObject } from '../../../../common/typed_json';
import {
  InfraLogEntry,
  InfraLogItem,
  InfraLogMessageSegment,
  InfraLogSummaryBucket,
  InfraLogSummaryHighlightBucket,
} from '../../../graphql/types';
import { InfraFrameworkRequest } from '../../adapters/framework';
import {
  InfraSourceConfiguration,
  InfraSources,
  SavedSourceConfigurationFieldColumnRuntimeType,
  SavedSourceConfigurationMessageColumnRuntimeType,
  SavedSourceConfigurationTimestampColumnRuntimeType,
} from '../../sources';
import { getBuiltinRules } from './builtin_rules';
import { convertDocumentSourceToLogItemFields } from './convert_document_source_to_log_item_fields';
import {
  CompiledLogMessageFormattingRule,
  Fields,
  Highlights,
  compileFormattingRules,
} from './message';

export class InfraLogEntriesDomain {
  constructor(
    private readonly adapter: LogEntriesAdapter,
    private readonly libs: { sources: InfraSources }
  ) {}

  public async getLogEntriesAround(
    request: InfraFrameworkRequest,
    sourceId: string,
    key: TimeKey,
    maxCountBefore: number,
    maxCountAfter: number,
    filterQuery?: LogEntryQuery,
    highlightQuery?: LogEntryQuery
  ): Promise<{ entriesBefore: InfraLogEntry[]; entriesAfter: InfraLogEntry[] }> {
    if (maxCountBefore <= 0 && maxCountAfter <= 0) {
      return {
        entriesBefore: [],
        entriesAfter: [],
      };
    }

    const { configuration } = await this.libs.sources.getSourceConfiguration(request, sourceId);
    const messageFormattingRules = compileFormattingRules(
      getBuiltinRules(configuration.fields.message)
    );
    const requiredFields = getRequiredFields(configuration, messageFormattingRules);

    const documentsBefore = await this.adapter.getAdjacentLogEntryDocuments(
      request,
      configuration,
      requiredFields,
      key,
      'desc',
      Math.max(maxCountBefore, 1),
      filterQuery,
      highlightQuery
    );
    const lastKeyBefore =
      documentsBefore.length > 0
        ? documentsBefore[documentsBefore.length - 1].key
        : {
            time: key.time - 1,
            tiebreaker: 0,
          };

    const documentsAfter = await this.adapter.getAdjacentLogEntryDocuments(
      request,
      configuration,
      requiredFields,
      lastKeyBefore,
      'asc',
      maxCountAfter,
      filterQuery,
      highlightQuery
    );

    return {
      entriesBefore: (maxCountBefore > 0 ? documentsBefore : []).map(
        convertLogDocumentToEntry(sourceId, configuration.logColumns, messageFormattingRules.format)
      ),
      entriesAfter: documentsAfter.map(
        convertLogDocumentToEntry(sourceId, configuration.logColumns, messageFormattingRules.format)
      ),
    };
  }

  public async getLogEntriesBetween(
    request: InfraFrameworkRequest,
    sourceId: string,
    startKey: TimeKey,
    endKey: TimeKey,
    filterQuery?: LogEntryQuery,
    highlightQuery?: LogEntryQuery
  ): Promise<InfraLogEntry[]> {
    const { configuration } = await this.libs.sources.getSourceConfiguration(request, sourceId);
    const messageFormattingRules = compileFormattingRules(
      getBuiltinRules(configuration.fields.message)
    );
    const requiredFields = getRequiredFields(configuration, messageFormattingRules);
    const documents = await this.adapter.getContainedLogEntryDocuments(
      request,
      configuration,
      requiredFields,
      startKey,
      endKey,
      filterQuery,
      highlightQuery
    );
    const entries = documents.map(
      convertLogDocumentToEntry(sourceId, configuration.logColumns, messageFormattingRules.format)
    );
    return entries;
  }

  public async getLogEntryHighlights(
    request: InfraFrameworkRequest,
    sourceId: string,
    startKey: TimeKey,
    endKey: TimeKey,
    highlights: Array<{
      query: string;
      countBefore: number;
      countAfter: number;
    }>,
    filterQuery?: LogEntryQuery
  ): Promise<InfraLogEntry[][]> {
    const { configuration } = await this.libs.sources.getSourceConfiguration(request, sourceId);
    const messageFormattingRules = compileFormattingRules(
      getBuiltinRules(configuration.fields.message)
    );
    const requiredFields = getRequiredFields(configuration, messageFormattingRules);

    const documentSets = await Promise.all(
      highlights.map(async highlight => {
        const highlightQuery = createHighlightQueryDsl(highlight.query, requiredFields);
        const query = filterQuery
          ? {
              bool: {
                filter: [filterQuery, highlightQuery],
              },
            }
          : highlightQuery;
        const [documentsBefore, documents, documentsAfter] = await Promise.all([
          this.adapter.getAdjacentLogEntryDocuments(
            request,
            configuration,
            requiredFields,
            startKey,
            'desc',
            highlight.countBefore,
            query,
            highlightQuery
          ),
          this.adapter.getContainedLogEntryDocuments(
            request,
            configuration,
            requiredFields,
            startKey,
            endKey,
            query,
            highlightQuery
          ),
          this.adapter.getAdjacentLogEntryDocuments(
            request,
            configuration,
            requiredFields,
            endKey,
            'asc',
            highlight.countAfter,
            query,
            highlightQuery
          ),
        ]);
        const entries = [...documentsBefore, ...documents, ...documentsAfter].map(
          convertLogDocumentToEntry(
            sourceId,
            configuration.logColumns,
            messageFormattingRules.format
          )
        );

        return entries;
      })
    );

    return documentSets;
  }

  public async getLogSummaryBucketsBetween(
    request: InfraFrameworkRequest,
    sourceId: string,
    start: number,
    end: number,
    bucketSize: number,
    filterQuery?: LogEntryQuery
  ): Promise<InfraLogSummaryBucket[]> {
    const { configuration } = await this.libs.sources.getSourceConfiguration(request, sourceId);
    const dateRangeBuckets = await this.adapter.getContainedLogSummaryBuckets(
      request,
      configuration,
      start,
      end,
      bucketSize,
      filterQuery
    );
    return dateRangeBuckets;
  }

  public async getLogSummaryHighlightBucketsBetween(
    request: InfraFrameworkRequest,
    sourceId: string,
    start: number,
    end: number,
    bucketSize: number,
    highlightQueries: string[],
    filterQuery?: LogEntryQuery
  ): Promise<InfraLogSummaryHighlightBucket[][]> {
    const { configuration } = await this.libs.sources.getSourceConfiguration(request, sourceId);
    const messageFormattingRules = compileFormattingRules(
      getBuiltinRules(configuration.fields.message)
    );
    const requiredFields = getRequiredFields(configuration, messageFormattingRules);

    const summaries = await Promise.all(
      highlightQueries.map(async highlightQueryPhrase => {
        const highlightQuery = createHighlightQueryDsl(highlightQueryPhrase, requiredFields);
        const query = filterQuery
          ? {
              bool: {
                must: [filterQuery, highlightQuery],
              },
            }
          : highlightQuery;
        const summaryBuckets = await this.adapter.getContainedLogSummaryBuckets(
          request,
          configuration,
          start,
          end,
          bucketSize,
          query
        );
        const summaryHighlightBuckets = summaryBuckets
          .filter(logSummaryBucketHasEntries)
          .map(convertLogSummaryBucketToSummaryHighlightBucket);
        return summaryHighlightBuckets;
      })
    );

    return summaries;
  }

  public async getLogItem(
    request: InfraFrameworkRequest,
    id: string,
    sourceConfiguration: InfraSourceConfiguration
  ): Promise<InfraLogItem> {
    const document = await this.adapter.getLogItem(request, id, sourceConfiguration);
    const defaultFields = [
      { field: '_index', value: document._index },
      { field: '_id', value: document._id },
    ];

    return {
      id: document._id,
      index: document._index,
      key: {
        time: document.sort[0],
        tiebreaker: document.sort[1],
      },
      fields: sortBy(
        [...defaultFields, ...convertDocumentSourceToLogItemFields(document._source)],
        'field'
      ),
    };
  }
}

interface LogItemHit {
  _index: string;
  _id: string;
  _source: JsonObject;
  sort: [number, number];
}

export interface LogEntriesAdapter {
  getAdjacentLogEntryDocuments(
    request: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    fields: string[],
    start: TimeKey,
    direction: 'asc' | 'desc',
    maxCount: number,
    filterQuery?: LogEntryQuery,
    highlightQuery?: LogEntryQuery
  ): Promise<LogEntryDocument[]>;

  getContainedLogEntryDocuments(
    request: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    fields: string[],
    start: TimeKey,
    end: TimeKey,
    filterQuery?: LogEntryQuery,
    highlightQuery?: LogEntryQuery
  ): Promise<LogEntryDocument[]>;

  getContainedLogSummaryBuckets(
    request: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    start: number,
    end: number,
    bucketSize: number,
    filterQuery?: LogEntryQuery
  ): Promise<LogSummaryBucket[]>;

  getLogItem(
    request: InfraFrameworkRequest,
    id: string,
    source: InfraSourceConfiguration
  ): Promise<LogItemHit>;
}

export type LogEntryQuery = JsonObject;

export interface LogEntryDocument {
  fields: Fields;
  gid: string;
  highlights: Highlights;
  key: TimeKey;
}

export interface LogSummaryBucket {
  entriesCount: number;
  start: number;
  end: number;
  topEntryKeys: TimeKey[];
}

const convertLogDocumentToEntry = (
  sourceId: string,
  logColumns: InfraSourceConfiguration['logColumns'],
  formatLogMessage: (fields: Fields, highlights: Highlights) => InfraLogMessageSegment[]
) => (document: LogEntryDocument): InfraLogEntry => ({
  key: document.key,
  gid: document.gid,
  source: sourceId,
  columns: logColumns.map(logColumn => {
    if (SavedSourceConfigurationTimestampColumnRuntimeType.is(logColumn)) {
      return {
        columnId: logColumn.timestampColumn.id,
        timestamp: document.key.time,
      };
    } else if (SavedSourceConfigurationMessageColumnRuntimeType.is(logColumn)) {
      return {
        columnId: logColumn.messageColumn.id,
        message: formatLogMessage(document.fields, document.highlights),
      };
    } else {
      return {
        columnId: logColumn.fieldColumn.id,
        field: logColumn.fieldColumn.field,
        highlights: document.highlights[logColumn.fieldColumn.field] || [],
        value: stringify(document.fields[logColumn.fieldColumn.field] || null),
      };
    }
  }),
});

const logSummaryBucketHasEntries = (bucket: LogSummaryBucket) =>
  bucket.entriesCount > 0 && bucket.topEntryKeys.length > 0;

const convertLogSummaryBucketToSummaryHighlightBucket = (
  bucket: LogSummaryBucket
): InfraLogSummaryHighlightBucket => ({
  entriesCount: bucket.entriesCount,
  start: bucket.start,
  end: bucket.end,
  representativeKey: bucket.topEntryKeys[0],
});

const getRequiredFields = (
  configuration: InfraSourceConfiguration,
  messageFormattingRules: CompiledLogMessageFormattingRule
): string[] => {
  const fieldsFromCustomColumns = configuration.logColumns.reduce<string[]>(
    (accumulatedFields, logColumn) => {
      if (SavedSourceConfigurationFieldColumnRuntimeType.is(logColumn)) {
        return [...accumulatedFields, logColumn.fieldColumn.field];
      }
      return accumulatedFields;
    },
    []
  );
  const fieldsFromFormattingRules = messageFormattingRules.requiredFields;

  return Array.from(new Set([...fieldsFromCustomColumns, ...fieldsFromFormattingRules]));
};

const createHighlightQueryDsl = (phrase: string, fields: string[]) => ({
  multi_match: {
    fields,
    lenient: true,
    query: phrase,
    type: 'phrase',
  },
});
