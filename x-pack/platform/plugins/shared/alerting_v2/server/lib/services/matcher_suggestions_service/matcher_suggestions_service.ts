/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { inject, injectable } from 'inversify';
import { flattenObject } from '@kbn/object-utils';
import { EsServiceScopedToken } from '../es_service/tokens';
import { RuleSavedObjectsClientToken } from '../rules_saved_object_service/tokens';
import {
  ALERT_EVENTS_DATA_STREAM,
  alertEpisodeStatus,
} from '../../../resources/datastreams/alert_events';
import { RULE_SAVED_OBJECT_TYPE, type RuleSavedObjectAttributes } from '../../../saved_objects';

const MAX_SUGGESTIONS = 10;
const MAX_DATA_FIELDS = 100;
const DATA_FIELD_SAMPLE_SIZE = 1000;
const ALERT_EVENTS_LOOKBACK = 'now-24h';

const EPISODE_STATUS_VALUES = Object.values(alertEpisodeStatus);

enum MatcherField {
  EpisodeStatus = 'episode_status',
  RuleName = 'rule.name',
  RuleDescription = 'rule.description',
  RuleTags = 'rule.tags',
  RuleId = 'rule.id',
  EpisodeId = 'episode_id',
  GroupHash = 'group_hash',
}

interface RuleSoFieldConfig {
  searchField: string;
  accessor: (attrs: RuleSavedObjectAttributes) => string | undefined;
}

const RULE_SO_FIELD_CONFIG: Partial<Record<MatcherField, RuleSoFieldConfig>> = {
  [MatcherField.RuleName]: {
    searchField: 'metadata.name',
    accessor: (a) => a.metadata.name,
  },
  [MatcherField.RuleDescription]: {
    searchField: 'metadata.description',
    accessor: (a) => a.metadata.description,
  },
};

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
    @inject(RuleSavedObjectsClientToken)
    private readonly ruleSoClient: SavedObjectsClientContract,
    @inject(EsServiceScopedToken)
    private readonly esClient: ElasticsearchClient
  ) {}

  async getSuggestions(field: string, query: string): Promise<string[]> {
    const soFieldConfig = RULE_SO_FIELD_CONFIG[field as MatcherField];
    if (soFieldConfig) {
      return this.getRuleSoFieldSuggestions(
        query,
        soFieldConfig.searchField,
        soFieldConfig.accessor
      );
    }

    const esField = MATCHER_FIELD_TO_ES_FIELD[field as MatcherField];
    if (esField) {
      return this.getAlertEventFieldSuggestions(esField, query);
    }

    switch (field) {
      case MatcherField.EpisodeStatus:
        return this.getStaticSuggestions(EPISODE_STATUS_VALUES, query);

      case MatcherField.RuleTags:
        return this.getRuleTagsSuggestions(query);

      case MatcherField.RuleId:
        return this.getRuleIdSuggestions(query);

      default:
        if (field.startsWith('data.')) {
          return this.getAlertEventFieldSuggestions(field, query);
        }
        return [];
    }
  }

  async getDataFieldNames(): Promise<string[]> {
    try {
      const result = await this.esClient.search({
        index: ALERT_EVENTS_DATA_STREAM,
        size: DATA_FIELD_SAMPLE_SIZE,
        timeout: '10s',
        _source: ['data'],
        query: {
          bool: {
            filter: [
              { term: { type: 'alert' } },
              { range: { '@timestamp': { gte: ALERT_EVENTS_LOOKBACK } } },
              { exists: { field: 'data' } },
              { terms: { 'episode.status': ['pending', 'active', 'recovering'] } },
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

  private async getRuleSoFieldSuggestions(
    query: string,
    searchField: string,
    accessor: (attrs: RuleSavedObjectAttributes) => string | undefined
  ): Promise<string[]> {
    const result = await this.ruleSoClient.find<RuleSavedObjectAttributes>({
      type: RULE_SAVED_OBJECT_TYPE,
      page: 1,
      perPage: MAX_SUGGESTIONS,
      ...(query ? { search: `${getEscapedQuery(query)}*`, searchFields: [searchField] } : {}),
      sortField: 'updatedAt',
      sortOrder: 'desc',
    });

    return result.saved_objects
      .map((so) => accessor(so.attributes))
      .filter((v): v is string => typeof v === 'string' && v.length > 0);
  }

  private async getRuleTagsSuggestions(query: string): Promise<string[]> {
    const result = await this.ruleSoClient.find<RuleSavedObjectAttributes>({
      type: RULE_SAVED_OBJECT_TYPE,
      page: 1,
      perPage: 100,
      fields: ['metadata.tags'],
      sortField: 'updatedAt',
      sortOrder: 'desc',
    });

    const allTags = new Set<string>();
    for (const so of result.saved_objects) {
      const tags = so.attributes.metadata?.tags;
      if (Array.isArray(tags)) {
        for (const tag of tags) {
          allTags.add(tag);
        }
      }
    }

    const lowerQuery = query.toLowerCase();
    return Array.from(allTags)
      .filter((tag) => !lowerQuery || tag.toLowerCase().startsWith(lowerQuery))
      .sort()
      .slice(0, MAX_SUGGESTIONS);
  }

  private async getRuleIdSuggestions(query: string): Promise<string[]> {
    const result = await this.ruleSoClient.find<RuleSavedObjectAttributes>({
      type: RULE_SAVED_OBJECT_TYPE,
      page: 1,
      perPage: 100,
      sortField: 'updatedAt',
      sortOrder: 'desc',
    });

    const lowerQuery = query.toLowerCase();
    return result.saved_objects
      .map((so) => so.id)
      .filter((id) => !lowerQuery || id.toLowerCase().startsWith(lowerQuery))
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
