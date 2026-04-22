/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqBy } from 'lodash';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { InferenceClient } from '@kbn/inference-common';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { getSampleDocuments } from '@kbn/ai-tools';
import { identifyFeatures } from '@kbn/streams-ai';
import { featuresPrompt } from '@kbn/streams-ai/src/features/prompt';
import {
  discoverFeaturesCommonDefinition,
  type DiscoverFeaturesOutput,
} from '../../common/step_types/discover_features';

const FROM_PATTERN = /FROM\s+([^\s|]+)/i;

const FEATURES_INDEX_ALIAS = '.kibana_streams_features';
const STREAMS_INDEX_ALIAS = '.kibana_streams';

interface FeatureSummary {
  id: string;
  type: string;
  subtype?: string;
  title?: string;
  description: string;
  properties?: Record<string, unknown>;
  tags?: string[];
  stream_name?: string;
}

interface DataViewReport {
  name: string;
  pattern: string;
  source: 'existing_kis' | 'inline_extraction' | 'skipped';
  stream_name?: string;
  feature_count: number;
}

function extractIndexPatternsFromRules(
  rules: Array<{ id: string; rule: Record<string, unknown> }>
): Set<string> {
  const patterns = new Set<string>();
  for (const { rule } of rules) {
    const baseQuery = getNestedString(rule, 'evaluation.query.base');
    if (baseQuery) {
      const match = baseQuery.match(FROM_PATTERN);
      if (match) patterns.add(match[1]);
    }
  }
  return patterns;
}

function getNestedString(obj: Record<string, unknown>, path: string): string | null {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return null;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : null;
}

function patternOverlaps(dataViewPattern: string, rulePattern: string): boolean {
  const dvBase = dataViewPattern.replace(/[*-]/g, '').toLowerCase();
  const ruleBase = rulePattern.replace(/[*-]/g, '').toLowerCase();
  return dvBase.includes(ruleBase) || ruleBase.includes(dvBase);
}

function streamNameMatchesPattern(streamName: string, pattern: string): boolean {
  if (streamName === pattern) return true;
  const normalizedStream = streamName.replace(/\./g, '-');
  const patternBase = pattern.replace(/[*]/g, '');
  return (
    normalizedStream.startsWith(patternBase) ||
    pattern.startsWith(normalizedStream) ||
    patternBase.startsWith(normalizedStream)
  );
}

async function fetchDataViews(
  soClient: SavedObjectsClientContract,
  logger: { debug: (msg: string) => void }
): Promise<Array<{ name: string; pattern: string }>> {
  try {
    const response = await soClient.find<{ title: string; name?: string }>({
      type: 'index-pattern',
      perPage: 100,
      fields: ['title', 'name'],
    });
    return response.saved_objects.map((so) => ({
      name: so.attributes.name || so.attributes.title,
      pattern: so.attributes.title,
    }));
  } catch (err) {
    logger.debug(`Failed to fetch data views: ${err instanceof Error ? err.message : err}`);
    return [];
  }
}

async function fetchStreamNames(
  esClient: ElasticsearchClient,
  logger: { debug: (msg: string) => void }
): Promise<Set<string>> {
  try {
    const response = await esClient.search({
      index: STREAMS_INDEX_ALIAS,
      size: 1000,
      _source: ['name'],
      query: { match_all: {} },
    });
    const names = new Set<string>();
    for (const hit of response.hits.hits) {
      const source = hit._source as { name?: string } | undefined;
      if (source?.name) names.add(source.name);
    }
    return names;
  } catch {
    logger.debug('Streams index not available — skipping stream resolution');
    return new Set();
  }
}

async function fetchKIsForStream(
  esClient: ElasticsearchClient,
  streamName: string,
  logger: { debug: (msg: string) => void }
): Promise<FeatureSummary[]> {
  try {
    const response = await esClient.search({
      index: FEATURES_INDEX_ALIAS,
      size: 50,
      query: {
        bool: {
          filter: [
            { term: { 'stream.name': streamName } },
            { term: { 'feature.status': 'active' } },
          ],
          must_not: [{ exists: { field: 'feature.excluded_at' } }],
        },
      },
      _source: [
        'feature.id',
        'feature.type',
        'feature.subtype',
        'feature.title',
        'feature.description',
        'feature.properties',
        'feature.tags',
        'stream.name',
      ],
    });

    return response.hits.hits
      .map((hit) => {
        const src = hit._source as Record<string, unknown> | undefined;
        if (!src) return null;
        const feature = src.feature as Record<string, unknown> | undefined;
        const stream = src.stream as Record<string, unknown> | undefined;
        if (!feature) return null;
        return {
          id: feature.id as string,
          type: feature.type as string,
          subtype: feature.subtype as string | undefined,
          title: feature.title as string | undefined,
          description: (feature.description as string) || '',
          properties: feature.properties as Record<string, unknown> | undefined,
          tags: feature.tags as string[] | undefined,
          stream_name: stream?.name as string | undefined,
        };
      })
      .filter((f): f is FeatureSummary => f !== null);
  } catch {
    logger.debug(`Failed to fetch KIs for stream ${streamName}`);
    return [];
  }
}

async function runInlineExtraction(
  esClient: ElasticsearchClient,
  pattern: string,
  inferenceClient: InferenceClient,
  connectorId: string,
  signal: AbortSignal,
  logger: { debug: (msg: string) => void; info: (msg: string) => void }
): Promise<FeatureSummary[]> {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  let sampleHits: Array<SearchHit<Record<string, unknown>>>;
  try {
    const result = await getSampleDocuments({
      esClient,
      index: pattern,
      start: oneDayAgo,
      end: now,
      size: 20,
    });
    sampleHits = result.hits;
  } catch (err) {
    logger.debug(
      `Failed to sample documents from ${pattern}: ${err instanceof Error ? err.message : err}`
    );
    return [];
  }

  if (sampleHits.length === 0) {
    logger.debug(`No documents found in ${pattern} for inline extraction`);
    return [];
  }

  const boundClient = inferenceClient.bindTo({ connectorId });
  const streamName = pattern.replace(/[*-]/g, '.').replace(/^\.+|\.+$/g, '') || pattern;

  const result = await identifyFeatures({
    streamName,
    sampleDocuments: sampleHits,
    inferenceClient: boundClient,
    systemPrompt: featuresPrompt,
    logger: logger as any,
    signal,
  });

  return result.features.map((f) => ({
    id: f.id,
    type: f.type,
    subtype: f.subtype,
    title: f.title,
    description: f.description,
    properties: f.properties,
    tags: f.tags,
    stream_name: streamName,
  }));
}

export interface DiscoverFeaturesDeps {
  getScopedSoClient: (fakeRequest: any) => SavedObjectsClientContract;
  getInferenceClient: (fakeRequest: any) => InferenceClient | undefined;
  getDefaultConnectorId: (fakeRequest: any) => Promise<string | undefined>;
}

export const createDiscoverFeaturesStepDefinition = (deps: DiscoverFeaturesDeps) =>
  createServerStepDefinition({
    ...discoverFeaturesCommonDefinition,
    handler: async (context) => {
      const esClient = context.contextManager.getScopedEsClient();
      const fakeRequest = context.contextManager.getFakeRequest();
      const soClient = deps.getScopedSoClient(fakeRequest);
      const { rules, max_data_views: maxDataViews } = context.input;

      const allFeatures: FeatureSummary[] = [];
      const dataViewsProcessed: DataViewReport[] = [];

      const dataViews = await fetchDataViews(soClient, context.logger);

      if (dataViews.length === 0) {
        context.logger.info('No data views found in current space');
        return { output: { features: [], data_views_processed: [] } };
      }

      const rulePatterns = extractIndexPatternsFromRules(rules);

      const scored = dataViews.map((dv) => {
        const overlap = [...rulePatterns].some((rp) => patternOverlaps(dv.pattern, rp));
        return { ...dv, score: overlap ? 1 : 0 };
      });
      scored.sort((a, b) => b.score - a.score);
      const selected = scored.slice(0, maxDataViews);

      const streamNames = await fetchStreamNames(esClient, context.logger);

      let inferenceClient: InferenceClient | undefined;
      let connectorId: string | undefined;
      try {
        connectorId = await deps.getDefaultConnectorId(fakeRequest);
        if (connectorId) {
          inferenceClient = deps.getInferenceClient(fakeRequest);
        }
      } catch {
        context.logger.debug('Inference plugin not available — inline extraction disabled');
      }

      for (const dv of selected) {
        let matchedStream: string | undefined;
        for (const sn of streamNames) {
          if (streamNameMatchesPattern(sn, dv.pattern)) {
            matchedStream = sn;
            break;
          }
        }

        if (matchedStream) {
          const kis = await fetchKIsForStream(esClient, matchedStream, context.logger);
          if (kis.length > 0) {
            allFeatures.push(...kis);
            dataViewsProcessed.push({
              name: dv.name,
              pattern: dv.pattern,
              source: 'existing_kis',
              stream_name: matchedStream,
              feature_count: kis.length,
            });
            continue;
          }
        }

        if (inferenceClient && connectorId) {
          try {
            const extracted = await runInlineExtraction(
              esClient,
              dv.pattern,
              inferenceClient,
              connectorId,
              context.abortSignal,
              context.logger
            );
            allFeatures.push(...extracted);
            dataViewsProcessed.push({
              name: dv.name,
              pattern: dv.pattern,
              source: 'inline_extraction',
              stream_name: matchedStream,
              feature_count: extracted.length,
            });
          } catch (err) {
            context.logger.warn(
              `Inline extraction failed for ${dv.pattern}: ${
                err instanceof Error ? err.message : err
              }`
            );
            dataViewsProcessed.push({
              name: dv.name,
              pattern: dv.pattern,
              source: 'skipped',
              stream_name: matchedStream,
              feature_count: 0,
            });
          }
        } else {
          dataViewsProcessed.push({
            name: dv.name,
            pattern: dv.pattern,
            source: 'skipped',
            stream_name: matchedStream,
            feature_count: 0,
          });
        }
      }

      const dedupedFeatures = uniqBy(allFeatures, (f) => f.id);

      context.logger.info(
        `Discovered ${dedupedFeatures.length} features from ${dataViewsProcessed.length} data views`
      );

      const output: DiscoverFeaturesOutput = {
        features: dedupedFeatures,
        data_views_processed: dataViewsProcessed,
      };

      return { output };
    },
  });
