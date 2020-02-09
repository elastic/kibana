/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  InfraLogEntryColumn,
  InfraLogEntryFieldColumn,
  InfraLogEntryMessageColumn,
  InfraLogEntryTimestampColumn,
  InfraLogMessageConstantSegment,
  InfraLogMessageFieldSegment,
  InfraLogMessageSegment,
  InfraSourceResolvers,
} from '../../graphql/types';
import { InfraLogEntriesDomain } from '../../lib/domains/log_entries_domain';
import { parseFilterQuery } from '../../utils/serialized_query';
import { ChildResolverOf, InfraResolverOf } from '../../utils/typed_resolvers';
import { QuerySourceResolver } from '../sources/resolvers';

export type InfraSourceLogEntriesAroundResolver = ChildResolverOf<
  InfraResolverOf<InfraSourceResolvers.LogEntriesAroundResolver>,
  QuerySourceResolver
>;

export type InfraSourceLogEntriesBetweenResolver = ChildResolverOf<
  InfraResolverOf<InfraSourceResolvers.LogEntriesBetweenResolver>,
  QuerySourceResolver
>;

export type InfraSourceLogEntryHighlightsResolver = ChildResolverOf<
  InfraResolverOf<InfraSourceResolvers.LogEntryHighlightsResolver>,
  QuerySourceResolver
>;

export const createLogEntriesResolvers = (libs: {
  logEntries: InfraLogEntriesDomain;
}): {
  InfraSource: {
    logEntriesAround: InfraSourceLogEntriesAroundResolver;
    logEntriesBetween: InfraSourceLogEntriesBetweenResolver;
    logEntryHighlights: InfraSourceLogEntryHighlightsResolver;
  };
  InfraLogEntryColumn: {
    __resolveType(
      logEntryColumn: InfraLogEntryColumn
    ):
      | 'InfraLogEntryTimestampColumn'
      | 'InfraLogEntryMessageColumn'
      | 'InfraLogEntryFieldColumn'
      | null;
  };
  InfraLogMessageSegment: {
    __resolveType(
      messageSegment: InfraLogMessageSegment
    ): 'InfraLogMessageFieldSegment' | 'InfraLogMessageConstantSegment' | null;
  };
} => ({
  InfraSource: {
    async logEntriesAround(source, args, { req }) {
      const countBefore = args.countBefore || 0;
      const countAfter = args.countAfter || 0;

      const { entriesBefore, entriesAfter } = await libs.logEntries.getLogEntriesAround(
        req,
        source.id,
        args.key,
        countBefore + 1,
        countAfter + 1,
        parseFilterQuery(args.filterQuery)
      );

      const hasMoreBefore = entriesBefore.length > countBefore;
      const hasMoreAfter = entriesAfter.length > countAfter;

      const entries = [
        ...(hasMoreBefore ? entriesBefore.slice(1) : entriesBefore),
        ...(hasMoreAfter ? entriesAfter.slice(0, -1) : entriesAfter),
      ];

      return {
        start: entries.length > 0 ? entries[0].key : null,
        end: entries.length > 0 ? entries[entries.length - 1].key : null,
        hasMoreBefore,
        hasMoreAfter,
        filterQuery: args.filterQuery,
        entries,
      };
    },
    async logEntriesBetween(source, args, { req }) {
      const entries = await libs.logEntries.getLogEntriesBetween(
        req,
        source.id,
        args.startKey,
        args.endKey,
        parseFilterQuery(args.filterQuery)
      );

      return {
        start: entries.length > 0 ? entries[0].key : null,
        end: entries.length > 0 ? entries[entries.length - 1].key : null,
        hasMoreBefore: true,
        hasMoreAfter: true,
        filterQuery: args.filterQuery,
        entries,
      };
    },
    async logEntryHighlights(source, args, { req }) {
      const highlightedLogEntrySets = await libs.logEntries.getLogEntryHighlights(
        req,
        source.id,
        args.startKey,
        args.endKey,
        args.highlights.filter(highlightInput => !!highlightInput.query),
        parseFilterQuery(args.filterQuery)
      );

      return highlightedLogEntrySets.map(entries => ({
        start: entries.length > 0 ? entries[0].key : null,
        end: entries.length > 0 ? entries[entries.length - 1].key : null,
        hasMoreBefore: true,
        hasMoreAfter: true,
        filterQuery: args.filterQuery,
        entries,
      }));
    },
  },
  InfraLogEntryColumn: {
    __resolveType(logEntryColumn) {
      if (isTimestampColumn(logEntryColumn)) {
        return 'InfraLogEntryTimestampColumn';
      }

      if (isMessageColumn(logEntryColumn)) {
        return 'InfraLogEntryMessageColumn';
      }

      if (isFieldColumn(logEntryColumn)) {
        return 'InfraLogEntryFieldColumn';
      }

      return null;
    },
  },
  InfraLogMessageSegment: {
    __resolveType(messageSegment) {
      if (isConstantSegment(messageSegment)) {
        return 'InfraLogMessageConstantSegment';
      }

      if (isFieldSegment(messageSegment)) {
        return 'InfraLogMessageFieldSegment';
      }

      return null;
    },
  },
});

const isTimestampColumn = (column: InfraLogEntryColumn): column is InfraLogEntryTimestampColumn =>
  'timestamp' in column;

const isMessageColumn = (column: InfraLogEntryColumn): column is InfraLogEntryMessageColumn =>
  'message' in column;

const isFieldColumn = (column: InfraLogEntryColumn): column is InfraLogEntryFieldColumn =>
  'field' in column && 'value' in column;

const isConstantSegment = (
  segment: InfraLogMessageSegment
): segment is InfraLogMessageConstantSegment => 'constant' in segment;

const isFieldSegment = (segment: InfraLogMessageSegment): segment is InfraLogMessageFieldSegment =>
  'field' in segment && 'value' in segment && 'highlights' in segment;
