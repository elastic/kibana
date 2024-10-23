/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { withoutOutputUpdateEvents, type InferenceClient } from '@kbn/inference-plugin/server';
import { getEntityKuery } from '@kbn/observability-utils-common/entities/get_entity_kuery';
import { formatValueForKql } from '@kbn/observability-utils-common/es/format_value_for_kql';
import type { TruncatedDocumentAnalysis } from '@kbn/observability-utils-common/llm/log_analysis/document_analysis';
import { highlightPatternFromRegex } from '@kbn/observability-utils-common/llm/log_analysis/highlight_patterns_from_regex';
import { ShortIdTable } from '@kbn/observability-utils-common/llm/short_id_table';
import { compact, groupBy } from 'lodash';
import { last, lastValueFrom, map } from 'rxjs';
import { FieldPatternResultWithChanges, getLogPatterns } from '../entities/get_log_patterns';
import { ObservabilityElasticsearchClient } from '../es/client/create_observability_es_client';

type LogPatternRelevance = 'normal' | 'unusual' | 'warning' | 'critical';

export type AnalyzedLogPattern = FieldPatternResultWithChanges & { relevance: LogPatternRelevance };

export interface AnalyzeLogPatternOutput {
  ownPatterns: AnalyzedLogPattern[];
  patternsFromOtherEntities: AnalyzedLogPattern[];
}

export async function analyzeLogPatterns({
  inferenceClient,
  connectorId,
  esClient,
  start,
  end,
  entity,
  index,
  logSources,
  allAnalysis,
  context,
}: {
  connectorId: string;
  inferenceClient: InferenceClient;
  esClient: ObservabilityElasticsearchClient;
  start: number;
  end: number;
  entity: Record<string, string>;
  index: string | string[];
  logSources: string[];
  allAnalysis: Array<{ dataStream: string; analysis: TruncatedDocumentAnalysis }>;
  context: string;
}): Promise<AnalyzeLogPatternOutput> {
  const kuery = getEntityKuery(entity);

  const fields = ['message', 'error.exception.message'];

  const systemPrompt = `You are a helpful assistant for Elastic Observability.
    You are an expert in analyzing log messages for software
    systems, and you use your extensive experience as an SRE
    to thoroughly analyze log patterns for things that require
    attention from the user.

    ## Entity

    The following entity is being analyzed:

    ${JSON.stringify(entity)}

    ### Entity analysis

    ${allAnalysis.map(({ dataStream, analysis }) => {
      return `#### Data stream: ${dataStream}

  ${JSON.stringify(analysis)}`;
    })}
    
    ## Context

    ${context}`;

  const [logPatternsFromEntity, logPatternsFromElsewhere] = await Promise.all([
    getLogPatterns({
      esClient,
      index,
      start,
      end,
      kuery,
      includeChanges: true,
      fields,
      metadata: [],
    }),
    getLogPatterns({
      esClient,
      index: logSources,
      start,
      end,
      kuery: `NOT (${kuery}) AND ${Object.values(entity)
        .map(
          (val) =>
            `(${fields
              .map((field) => `(${[field, formatValueForKql(val)].join(':')})`)
              .join(' OR ')})`
        )
        .join(' AND ')}`,
      metadata: Object.keys(entity),
      includeChanges: true,
      fields,
    }),
  ]);
  const patternIdLookupTable = new ShortIdTable();

  const patternsWithIds = [...logPatternsFromEntity, ...logPatternsFromElsewhere].map((pattern) => {
    return {
      ...pattern,
      shortId: patternIdLookupTable.take(pattern.regex),
    };
  });

  const patternsByRegex = new Map(patternsWithIds.map((pattern) => [pattern.regex, pattern]));

  const serializedOwnEntity = JSON.stringify(entity);

  const [ownPatterns, patternsFromOtherEntities] = await Promise.all([
    logPatternsFromEntity.length ? categorizeOwnPatterns() : [],
    logPatternsFromElsewhere.length ? selectRelevantPatternsFromOtherEntities() : [],
  ]);

  return {
    ownPatterns,
    patternsFromOtherEntities,
  };

  function categorizeOwnPatterns() {
    return lastValueFrom(
      inferenceClient
        .output('analyze_log_patterns', {
          connectorId,
          system: systemPrompt,
          input: `Based on the following log patterns from
            ${JSON.stringify(entity)}, group these patterns into
            the following categories:

            - normal (patterns that are indicative of normal operations)
            - unusual (patterns that indicate something unusual and/or
            appear rarely)
            - warning (patterns that indicate something is in an
            unexpected state)
            - critical (patterns that indicate a critical issue
            with the entity)

            ## Log patterns:

            ${preparePatternsForLlm(logPatternsFromEntity)}
          `,
          schema: {
            type: 'object',
            properties: {
              categories: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    relevance: {
                      type: 'string',
                      enum: ['normal', 'unusual', 'warning', 'critical'],
                    },
                    shortIds: {
                      type: 'array',
                      description:
                        'The pattern IDs you want to group here. Use the pattern short ID.',
                      items: {
                        type: 'string',
                      },
                    },
                  },
                  required: ['relevance', 'shortIds'],
                },
              },
            },
            required: ['categories'],
          } as const,
        })
        .pipe(
          last(),
          withoutOutputUpdateEvents(),
          map((outputEvent) => {
            return outputEvent.output.categories.flatMap((category) => {
              return mapIdsBackToPatterns(category.shortIds).map((pattern) => {
                return {
                  ...pattern,
                  relevance: category.relevance,
                };
              });
            });
          })
        )
    );
  }

  function selectRelevantPatternsFromOtherEntities() {
    return lastValueFrom(
      inferenceClient
        .output('select_relevant_patterns_from_other_entities', {
          connectorId,
          system: systemPrompt,
          input: `Based on the following log patterns that
            are NOT from ${serializedOwnEntity}, group these
            patterns into the following categories:

            - irrelevant (patterns that are not related to
            ${serializedOwnEntity})
            - normals (patterns that are relevant for
            ${serializedOwnEntity} but are indicative of normal
            operations
            - warning (patterns that are relevant for
            ${serializedOwnEntity} that indicate something is
            in an unexpected state)
            - critical (patterns that are relevant for
            ${serializedOwnEntity} that indicate a critical issue
            with the entity)

            ## Log patterns:

            ${preparePatternsForLlm(logPatternsFromElsewhere)}
          `,
          schema: {
            type: 'object',
            properties: {
              categories: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    relevance: {
                      type: 'string',
                      enum: ['irrelevant', 'normal', 'unusual', 'warning', 'critical'],
                    },
                    shortIds: {
                      type: 'array',
                      description:
                        'The pattern IDs you want to group here. Use the pattern short ID.',
                      items: {
                        type: 'string',
                      },
                    },
                  },
                  required: ['relevance', 'shortIds'],
                },
              },
            },
            required: ['categories'],
          } as const,
        })
        .pipe(
          withoutOutputUpdateEvents(),
          last(),
          map((outputEvent) => {
            return outputEvent.output.categories.flatMap((category) => {
              return mapIdsBackToPatterns(category.shortIds).flatMap((pattern) => {
                if (category.relevance === 'irrelevant') {
                  return [];
                }
                return [
                  {
                    ...pattern,
                    relevance: category.relevance,
                  },
                ];
              });
            });
          })
        )
    );
  }

  function preparePatternsForLlm(patterns: FieldPatternResultWithChanges[]): string {
    const groupedByField = groupBy(patterns, (pattern) => pattern.field);

    return Object.entries(groupedByField)
      .map(([field, patternsForField]) => {
        return `### \`${field}\`
        
        #### Patterns
        
        ${JSON.stringify(
          patternsForField.map((pattern) => {
            const patternWithHighlights = highlightPatternFromRegex(pattern.regex, pattern.sample);
            return {
              shortId: patternIdLookupTable.take(pattern.regex),
              patternWithHighlights,
              firstOccurrence: pattern.firstOccurrence,
              lastOccurrence: pattern.lastOccurrence,
              change: pattern.change,
              count: pattern.count,
              highlight: pattern.highlight,
            };
          })
        )}
        `;
      })
      .join('\n\n');
  }

  function mapIdsBackToPatterns(ids?: string[]) {
    return compact(
      ids?.map((shortId) => {
        const lookupId = patternIdLookupTable.lookup(shortId);
        if (!lookupId) {
          return undefined;
        }
        const pattern = patternsByRegex.get(lookupId);
        return pattern;
      })
    );
  }
}
