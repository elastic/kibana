/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceClient, withoutOutputUpdateEvents } from '@kbn/inference-plugin/server';
import pLimit from 'p-limit';
import { getEntityKuery } from '@kbn/observability-utils-common/entities/get_entity_kuery';
import { sortAndTruncateAnalyzedFields } from '@kbn/observability-utils-common/llm/log_analysis/sort_and_truncate_analyzed_fields';
import { lastValueFrom } from 'rxjs';
import { ObservabilityElasticsearchClient } from '../../es/client/create_observability_es_client';
import { rangeQuery } from '../../es/queries/range_query';
import { analyzeDocuments } from '../../entities/analyze_documents';
import { RCA_SYSTEM_PROMPT_BASE } from './system_prompt_base';

export async function findRelatedEntitiesViaKeywordSearches({
  connectorId,
  inferenceClient,
  esClient,
  start,
  end,
  searches,
  groupBy,
  context,
  index,
}: {
  connectorId: string;
  inferenceClient: InferenceClient;
  esClient: ObservabilityElasticsearchClient;
  start: number;
  end: number;
  searches: Array<{ fragments: string[]; relationship: string }>;
  groupBy: string;
  context: string;
  index: string | string[];
}) {
  const keywordSearchResults = await esClient.search('find_related_entities_via_keyword_searches', {
    track_total_hits: false,
    index,
    query: {
      bool: {
        must: [...rangeQuery(start, end)],
        should: [
          {
            multi_match: {
              query: searches.flatMap((search) => search.fragments).join(' '),
              fields: '*',
            },
          },
        ],
        minimum_should_match: 1,
      },
    },
    fields: [groupBy],
    collapse: {
      field: groupBy,
    },
    highlight: {
      fields: {
        '*': {},
      },
    },
    size: 1_000,
  });

  if (!keywordSearchResults.hits.hits.length) {
    return 'No entities found';
  }

  const limiter = pLimit(20);

  const allAnalysis = await Promise.all(
    keywordSearchResults.hits.hits.map(async (hit) => {
      return limiter(async () => {
        const groupValue = hit.fields![groupBy][0] as string;

        const analysis = await analyzeDocuments({
          esClient,
          start,
          end,
          index,
          kuery: getEntityKuery({
            [groupBy]: groupValue,
          }),
        });

        return {
          key: groupValue,
          highlight: hit.highlight!,
          analysis: sortAndTruncateAnalyzedFields(analysis),
        };
      });
    })
  );

  const relevantEntities$ = inferenceClient
    .output('select_relevant_entities', {
      connectorId,
      system: `${RCA_SYSTEM_PROMPT_BASE}

    Your goal is to select relevant entities based on the given context and
    an analysis of the data for that entity. These entities can then
    be analyzed further in a second step. The listed entities were found
    with keyword searches.

    ## Context

    ${context}

    ## Searches

    ${searches
      .map(({ fragments, relationship }) => {
        return `## Relationship: ${relationship}
        
        ### Fragments:
        ${fragments.map((fragment) => `- \`${fragment}\``).join('\n')}`;
      })
      .join('\n')}`,
      input: `From the following entities, select those that are relevant
    in the given context. For each relevant entity, give a description
    of why it is relevant, and what evidence you have found in the data.
    
    # Entities

    ${allAnalysis.map((analysis) => {
      return `## ${groupBy}:${analysis.key}
      
        ### Search highlights
        ${JSON.stringify(analysis.highlight)}

        ### Data analysis
        ${JSON.stringify(analysis.analysis)}
      `;
    })}
    
    `,
    })
    .pipe(withoutOutputUpdateEvents());

  const completeEvent = await lastValueFrom(relevantEntities$);

  return completeEvent.content;
}
