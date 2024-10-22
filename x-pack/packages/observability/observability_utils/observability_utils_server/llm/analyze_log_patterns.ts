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
import { compact } from 'lodash';
import { last, lastValueFrom, map } from 'rxjs';
import {
  FieldPatternResult,
  FieldPatternsResponse,
  getLogPatterns,
} from '../entities/get_log_patterns';
import { ObservabilityElasticsearchClient } from '../es/client/create_observability_es_client';

export interface AnalyzeLogPatternOutput {
  ownPatternCategories: Array<{
    label: string;
    patterns: Array<FieldPatternResult<true>>;
  }>;
  relevantPatternsFromOtherEntities: Array<FieldPatternResult<true>>;
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
      changes: true,
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
      changes: true,
      fields,
    }),
  ]);
  const patternIdLookupTable = new ShortIdTable();

  const patternsWithIds = [...logPatternsFromEntity, ...logPatternsFromElsewhere].map(
    ({ field, patterns }) => {
      return {
        field,
        patterns: patterns.map((pattern) => {
          return {
            ...pattern,
            shortId: patternIdLookupTable.take(pattern.regex),
          };
        }),
      };
    }
  );

  const allPatterns = patternsWithIds.flatMap(({ patterns }) => patterns);

  const patternsByRegex = new Map(allPatterns.map((pattern) => [pattern.regex, pattern]));

  const [ownPatternCategories, relevantPatternsFromOtherEntities] = await Promise.all([
    logPatternsFromEntity.length ? categorizeOwnPatterns() : [],
    logPatternsFromElsewhere.length ? selectRelevantPatternsFromOtherEntities() : [],
  ]);

  return {
    ownPatternCategories,
    relevantPatternsFromOtherEntities,
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

            ${logPatternsFromEntity.map(preparePatternsForLlm).join('\n\n')}
          `,
          schema: {
            type: 'object',
            properties: {
              categories: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    label: {
                      type: 'string',
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
                  required: ['label', 'shortIds'],
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
            return outputEvent.output.categories.map((category) => {
              return {
                label: category.label,
                patterns: mapIdsBackToPatterns(category.shortIds),
              };
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
            are NOT from ${JSON.stringify(entity)},
            select those that might be relevant to the entity,
            based on the provided entity and context.

            Only select patterns that mention the entity that
            is being investigated.

            ## Log patterns:

            ${logPatternsFromElsewhere.map(preparePatternsForLlm).join('\n\n')}
          `,
          schema: {
            type: 'object',
            properties: {
              relevantPatterns: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    shortId: {
                      type: 'string',
                    },
                  },
                  required: ['shortId'],
                },
              },
            },
            required: ['relevantPatterns'],
          } as const,
        })
        .pipe(
          withoutOutputUpdateEvents(),
          last(),
          map((outputEvent) => {
            return mapIdsBackToPatterns(
              outputEvent.output.relevantPatterns.map(({ shortId }) => shortId)
            );
          })
        )
    );
  }

  function preparePatternsForLlm({ field, patterns }: FieldPatternsResponse<true>) {
    return `### \`${field}\`
        
        #### Patterns
        
        ${JSON.stringify(
          patterns.map((pattern) => {
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
