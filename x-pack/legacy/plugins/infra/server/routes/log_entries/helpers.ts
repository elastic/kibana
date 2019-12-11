/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parseFilterQuery } from '../../utils/serialized_query';
import {
  InfraSourceConfiguration,
  SavedSourceConfigurationFieldColumnRuntimeType,
} from '../../lib/sources';
import { CompiledLogMessageFormattingRule } from '../../lib/domains/log_entries_domain/message';

// FIXME: move to a shared place, or to the elasticsearch-js repo
export interface DateRangeAggregation {
  buckets: Array<{
    key: number;
    doc_count: number;
    from: number;
    from_as_strign: string;
    to: number;
    to_as_string: string;
  }>;
  start: number;
  end: number;
}

interface RangeBucket {
  from: number;
  to: number;
}

export const generateRangeBuckets = (
  startDate: number,
  endDate: number,
  bucketSize: number
): RangeBucket[] => {
  const ranges: RangeBucket[] = [];

  for (let from = startDate; from <= endDate; from += bucketSize) {
    ranges.push({ from, to: from + bucketSize });
  }

  return ranges;
};

interface LogSummaryQueryBodyParams {
  startDate: number;
  endDate: number;
  bucketSize: number;
  timestampField: string;
  tiebreakerField: string;
  query?: string | null; // FIXME "null" shouldn't be necessary here
  highlightQuery?: object;
}

const TIMESTAMP_FORMAT = 'epoch_millis';

export const buildLogSummaryQueryBody = ({
  startDate,
  endDate,
  bucketSize,
  timestampField,
  tiebreakerField,
  query,
  highlightQuery,
}: LogSummaryQueryBodyParams) => {
  const filters = [parseFilterQuery(query), highlightQuery].filter(_ => _);

  return {
    size: 0,
    query: {
      bool: {
        filter: [
          ...(filters.length === 2 ? [{ bool: { must: filters } }] : filters),
          {
            range: { [timestampField]: { gte: startDate, lte: endDate, format: TIMESTAMP_FORMAT } },
          },
        ],
      },
    },
    aggs: {
      log_summary: {
        date_range: {
          field: timestampField,
          format: TIMESTAMP_FORMAT,
          ranges: generateRangeBuckets(startDate, endDate, bucketSize),
        },
        ...(highlightQuery
          ? {
              aggregations: {
                top_hits_by_key: {
                  top_hits: {
                    size: 1,
                    sort: [{ [timestampField]: 'asc' }, { [tiebreakerField]: 'asc' }],
                    _source: false,
                  },
                },
              },
            }
          : {}),
      },
    },
    sort: [{ [timestampField]: 'asc', [tiebreakerField]: 'asc' }],
  };
};

export const getRequiredFields = (
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

export const createHighlightQueryDsl = (phrase: string, fields: string[]) => ({
  multi_match: {
    fields,
    lenient: true,
    query: phrase,
    type: 'phrase',
  },
});
