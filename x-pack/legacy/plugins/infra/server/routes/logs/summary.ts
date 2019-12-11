/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { schema } from '@kbn/config-schema';

import { throwErrors } from '../../../common/runtime_types';

import { InfraBackendLibs } from '../../lib/infra_types';
import {
  LOG_ENTRIES_SUMMARY_PATH,
  logEntriesSummaryRequestRT,
  logEntriesSummaryResponseRT,
  LOG_ENTRIES_SUMMARY_HIGHLIGHTS_PATH,
  logEntriesSummaryHighlightsRequestRT,
  logEntriesSummaryHighlightsResponseRT,
} from '../../../common/http_api/log_entries';
import {
  compileFormattingRules,
  CompiledLogMessageFormattingRule,
} from '../../lib/domains/log_entries_domain/message';
import { getBuiltinRules } from '../../lib/domains/log_entries_domain/builtin_rules';
import { SavedSourceConfigurationFieldColumnRuntimeType } from '../../lib/sources';
import { InfraSourceConfiguration } from '../../../public/graphql/types';

import { buildLogSummaryQueryBody } from './helpers';

const escapeHatch = schema.object({}, { allowUnknowns: true });

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
  framework.registerRoute(
    {
      method: 'post',
      path: LOG_ENTRIES_SUMMARY_PATH,
      validate: { body: escapeHatch },
    },
    async (requestContext, request, response) => {
      try {
        const payload = pipe(
          logEntriesSummaryRequestRT.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );
        const { sourceId, startDate, endDate, bucketSize, query } = payload;

        const sourceConfiguration = (await sources.getSourceConfiguration(requestContext, sourceId))
          .configuration;

        const {
          timestamp: timestampField,
          tiebreaker: tiebreakerField,
        } = sourceConfiguration.fields;

        const esResults = await framework.callWithRequest<
          {},
          { log_summary: DateRangeAggregation }
        >(requestContext, 'search', {
          index: sourceConfiguration.logAlias,
          body: buildLogSummaryQueryBody({
            startDate,
            endDate,
            bucketSize,
            timestampField,
            tiebreakerField,
            query,
          }),
        });

        return response.ok({
          body: logEntriesSummaryResponseRT.encode({
            data: {
              start: startDate,
              end: endDate,
              buckets:
                esResults.aggregations?.log_summary.buckets.map(bucket => ({
                  start: bucket.from,
                  end: bucket.to,
                  entriesCount: bucket.doc_count,
                })) ?? [],
            },
          }),
        });
      } catch (error) {
        return response.internalError({
          body: error.message,
        });
      }
    }
  );

  // Summary Highlights
  framework.registerRoute(
    {
      method: 'post',
      path: LOG_ENTRIES_SUMMARY_HIGHLIGHTS_PATH,
      validate: { body: escapeHatch },
    },
    async (requestContext, request, response) => {
      try {
        const payload = pipe(
          logEntriesSummaryHighlightsRequestRT.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );
        const { sourceId, startDate, endDate, bucketSize, query, highlightTerms } = payload;

        const sourceConfiguration = (await sources.getSourceConfiguration(requestContext, sourceId))
          .configuration;

        const timestampField = sourceConfiguration.fields.timestamp;
        const tiebreakerField = sourceConfiguration.fields.tiebreaker;

        const messageFormattingRules = compileFormattingRules(
          getBuiltinRules(sourceConfiguration.fields.message)
        );
        const requiredFields = getRequiredFields(sourceConfiguration, messageFormattingRules);

        const summaries = await Promise.all(
          highlightTerms.map(async highlight => {
            const highlightQuery = createHighlightQueryDsl(highlight, requiredFields);

            const esResults = await framework.callWithRequest<
              {},
              { log_summary: DateRangeAggregation }
            >(requestContext, 'search', {
              index: sourceConfiguration.logAlias,
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

        return response.ok({
          body: logEntriesSummaryHighlightsResponseRT.encode({ data: summaries }),
        });
      } catch (error) {
        return response.internalError({
          body: error.message,
        });
      }
    }
  );
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
