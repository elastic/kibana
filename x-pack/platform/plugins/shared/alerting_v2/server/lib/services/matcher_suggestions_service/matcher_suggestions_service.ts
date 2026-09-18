/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { flattenObject } from '@kbn/object-utils';
import { inject, injectable } from 'inversify';
import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import { alertEpisodeStatus } from '../../../resources/datastreams/alert_events';
import { EsServiceScopedToken } from '../es_service/tokens';
import { buildAlertEventsFiltersFromMatcher } from './build_alert_events_filters_from_matcher';

const MAX_SUGGESTIONS = 10;
const MAX_DATA_FIELDS = 100;
const DATA_FIELD_SAMPLE_SIZE = 1000;
const ALERT_EVENTS_LOOKBACK = 'now-24h';

const EPISODE_STATUS_VALUES = Object.values(alertEpisodeStatus);

enum MatcherField {
  EpisodeStatus = 'episode_status',
  EpisodeId = 'episode_id',
  GroupHash = 'group_hash',
}

const MATCHER_FIELD_TO_ES_FIELD: Partial<Record<MatcherField, string>> = {
  [MatcherField.EpisodeId]: 'episode.id',
  [MatcherField.GroupHash]: 'group_hash',
};

const getEscapedQuery = (q: string = '') =>
  q.replace(/[.?+*|{}[\]()"\\#@&<>~]/g, (match) => `\\${match}`);

const isIndexNotFoundException = (e: unknown): boolean => {
  const err = e as Record<string, any> | undefined;
  return (
    err?.meta?.body?.error?.type === 'index_not_found_exception' ||
    err?.body?.error?.type === 'index_not_found_exception'
  );
};

@injectable()
export class MatcherSuggestionsService {
  constructor(
    @inject(EsServiceScopedToken)
    private readonly esClient: ElasticsearchClient
  ) {}

  async getSuggestions(field: string, query: string): Promise<string[]> {
    const esField = MATCHER_FIELD_TO_ES_FIELD[field as MatcherField];
    if (esField) {
      return this.getAlertEventFieldSuggestions(esField, query);
    }

    switch (field) {
      case MatcherField.EpisodeStatus:
        return this.getStaticSuggestions(EPISODE_STATUS_VALUES, query);

      default:
        if (field.startsWith('data.')) {
          return this.getAlertEventFieldSuggestions(field, query);
        }
        return [];
    }
  }

  async getDataFieldNames(matcher?: string): Promise<string[]> {
    try {
      const result = await this.esClient.search({
        index: ALERT_EVENTS_DATA_STREAM,
        size: DATA_FIELD_SAMPLE_SIZE,
        timeout: '10s',
        terminate_after: DATA_FIELD_SAMPLE_SIZE,
        _source: ['data'],
        query: {
          bool: {
            filter: [
              { term: { type: 'alert' } },
              { range: { '@timestamp': { gte: ALERT_EVENTS_LOOKBACK } } },
              { exists: { field: 'data' } },
              { terms: { 'episode.status': ['pending', 'active', 'recovering'] } },
              ...buildAlertEventsFiltersFromMatcher(matcher ?? ''),
            ],
          },
        },
        sort: [{ '@timestamp': 'desc' }],
      });

      const fieldNames = new Set<string>();
      for (const hit of result.hits.hits) {
        const source = hit._source as { data?: Record<string, unknown> } | undefined;
        if (source?.data && typeof source.data === 'object') {
          for (const key of Object.keys(flattenObject(source.data, 'data'))) {
            fieldNames.add(key);
          }
        }
      }

      return Array.from(fieldNames).sort().slice(0, MAX_DATA_FIELDS);
    } catch (e) {
      if (isIndexNotFoundException(e)) {
        return [];
      }
      throw e;
    }
  }

  private getStaticSuggestions(values: string[], query: string): string[] {
    const lowerQuery = query.toLowerCase();
    return values
      .filter((v) => !lowerQuery || v.toLowerCase().startsWith(lowerQuery))
      .slice(0, MAX_SUGGESTIONS);
  }

  private async getAlertEventFieldSuggestions(
    esFieldName: string,
    query: string
  ): Promise<string[]> {
    try {
      const result = await this.esClient.search({
        index: ALERT_EVENTS_DATA_STREAM,
        size: 0,
        timeout: '10s',
        terminate_after: 100000,
        query: {
          bool: {
            filter: [
              { term: { type: 'alert' } },
              { range: { '@timestamp': { gte: ALERT_EVENTS_LOOKBACK } } },
            ],
          },
        },
        aggs: {
          suggestions: {
            terms: {
              size: MAX_SUGGESTIONS,
              field: esFieldName,
              include: `${getEscapedQuery(query)}.*`,
              execution_hint: 'map' as const,
            },
          },
        },
      });

      const aggs = result.aggregations as
        | { suggestions?: { buckets?: Array<{ key: string }> } }
        | undefined;
      return (aggs?.suggestions?.buckets ?? []).map((bucket) => bucket.key);
    } catch (e) {
      if (isIndexNotFoundException(e)) {
        return [];
      }
      throw e;
    }
  }
}
