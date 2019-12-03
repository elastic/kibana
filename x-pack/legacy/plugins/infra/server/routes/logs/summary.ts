/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import { throwErrors } from '../../../common/runtime_types';

import { InfraBackendLibs } from '../../lib/infra_types';
import {
  LOGS_SUMMARY_PATH,
  logsSummaryRequestRT,
  logsSummaryResponseRT,
  LOGS_SUMMARY_HIGHLIGHTS_PATH,
  logsSummaryHighlightsRequestRT,
  logsSummaryHighlightsResponseRT,
} from '../../../common/http_api/logs';
import {
  compileFormattingRules,
  CompiledLogMessageFormattingRule,
} from '../../lib/domains/log_entries_domain/message';
import { getBuiltinRules } from '../../lib/domains/log_entries_domain/builtin_rules';
import { SavedSourceConfigurationFieldColumnRuntimeType } from '../../lib/sources';
import { InfraSourceConfiguration } from '../../../public/graphql/types';

import { buildLogSummaryQueryBody } from './helpers';

// FIXME: move to a shared place, or to the elasticsearch-js repo
interface DateRangeAggregation {
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

export const initLogsSummaryRoute = ({ framework, sources }: InfraBackendLibs) => {
  // Summary
  framework.registerRoute({
    method: 'POST',
    path: LOGS_SUMMARY_PATH,
    handler: async (req, res) => {
      try {
        // const space = framework.getSpaceId(req);
        // FIXME -> Shouldn't this be the active space?
        const source = await sources.getSourceConfiguration(req, 'default');
        const payload = pipe(
          logsSummaryRequestRT.decode(req.payload),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const {
          timestamp: timestampField,
          tiebreaker: tiebreakerField,
        } = source.configuration.fields;
        const { startDate, endDate, bucketSize, query } = payload;

        const esResults = await framework.callWithRequest<
          {},
          { log_summary: DateRangeAggregation }
        >(req, 'search', {
          index: source.configuration.logAlias,
          body: buildLogSummaryQueryBody({
            startDate,
            endDate,
            bucketSize,
            timestampField,
            tiebreakerField,
            query,
          }),
        });

        return res.response(
          logsSummaryResponseRT.encode({
            start: startDate,
            end: endDate,
            buckets:
              esResults.aggregations?.log_summary.buckets.map(bucket => ({
                start: bucket.from,
                end: bucket.to,
                entriesCount: bucket.doc_count,
              })) ?? [],
          })
        );
      } catch (error) {
        return Boom.badImplementation(error.message);
      }
    },
  });

  // Summary Highlights
  framework.registerRoute({
    method: 'POST',
    path: LOGS_SUMMARY_HIGHLIGHTS_PATH,
    handler: async (req, res) => {
      try {
        const source = await sources.getSourceConfiguration(req, 'default');

        const payload = pipe(
          logsSummaryHighlightsRequestRT.decode(req.payload),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const timestampField = source.configuration.fields.timestamp;
        const tiebreakerField = source.configuration.fields.tiebreaker;
        const { startDate, endDate, bucketSize, query, highlightTerms } = payload;

        const messageFormattingRules = compileFormattingRules(
          getBuiltinRules(source.configuration.fields.message)
        );
        const requiredFields = getRequiredFields(source.configuration, messageFormattingRules);

        const summaries = await Promise.all(
          highlightTerms.map(async highlight => {
            const highlightQuery = createHighlightQueryDsl(highlight, requiredFields);

            const esResults = await framework.callWithRequest<
              {},
              { log_summary: DateRangeAggregation }
            >(req, 'search', {
              index: source.configuration.logAlias,
              body: buildLogSummaryQueryBody({
                startDate,
                endDate,
                bucketSize,
                timestampField,
                tiebreakerField,
                query,
                highlightQuery,
              }),
            });

            return {
              start: startDate,
              end: endDate,
              buckets:
                esResults.aggregations?.log_summary.buckets
                  .map(bucket => ({
                    start: bucket.from,
                    end: bucket.to,
                    entriesCount: bucket.doc_count,
                    // @ts-ignore
                    representativeKey: bucket.top_hits_by_key.hits.hits.map(h => ({
                      tiebreaker: h.sort[1],
                      time: h.sort[0],
                    }))[0],
                  }))
                  .filter(bucket => bucket.entriesCount > 0) ?? [],
            };
          })
        );

        return res.response(logsSummaryHighlightsResponseRT.encode(summaries));
      } catch (error) {
        return Boom.badImplementation(error.message);
      }
    },
  });
};

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
