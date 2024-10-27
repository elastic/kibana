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
import { isEqual } from 'lodash';
import { Logger } from '@kbn/logging';
import { TruncatedDocumentAnalysis } from '@kbn/observability-utils-common/llm/log_analysis/document_analysis';
import { ObservabilityElasticsearchClient } from '../../es/client/create_observability_es_client';
import { rangeQuery } from '../../es/queries/range_query';
import { analyzeDocuments } from '../../entities/analyze_documents';
import {
  RCA_SYSTEM_PROMPT_BASE,
  SYSTEM_PROMPT_DEPENDENCIES,
  SYSTEM_PROMPT_ENTITIES,
} from './system_prompt_base';
import { kqlQuery } from '../../es/queries/kql_query';
import { formatEntity } from './format_entity';

export interface RelatedEntityFromSearchResults {
  entity: { [x: string]: string };
  highlight: Record<string, string[]>;
  analysis: TruncatedDocumentAnalysis;
}

const getInputPrompt = ({
  entity,
  dataToAnalyzePrompt,
  values,
  foundEntities,
}: {
  entity: Record<string, string>;
  dataToAnalyzePrompt: string;
  values: Array<{ fragments: string[]; relationship: string }>;
  foundEntities: RelatedEntityFromSearchResults[];
}) => `

Describe possible relationships to the investigated entity ${JSON.stringify(entity)}.
  
  ${dataToAnalyzePrompt}

  ## Search keywords

  ${values
    .map(({ fragments, relationship }) => {
      return `## Relationship: ${relationship}
        
        ### Fragments:
        ${fragments.map((fragment) => `- \`${fragment}\``).join('\n')}`;
    })
    .join('\n')}
  
  ## Found entities

  ${foundEntities.map(({ entity: analyzedEntity, analysis, highlight }) => {
    return `## Entity: ${JSON.stringify(analyzedEntity)}
    
      ### Search highlights
      ${JSON.stringify(highlight)}

      ### Data analysis
      ${JSON.stringify(analysis)}
    `;
  })}

### Indicator strength

In an Observability system, indicators of relationships between entities like
services, hosts, users, or requests can vary in strength. Some indicators
clearly define relationships, while others only suggest correlations. Here’s a
breakdown of these indicators into strong, average, and weak categories, with an
additional look at how weak indicators can become strong when combined.

Strong indicators provide definitive links between entities. Distributed tracing
IDs (trace, span, and parent) are among the strongest indicators, as they map
the complete request path across services, showing exact service interactions.
Session or user IDs are also strong indicators, capturing a user’s actions
across services or hosts and revealing issues specific to particular users.
Container or pod IDs fall into this category too, as they point directly to
specific workloads or service deployments, especially in microservices
architectures where workloads are frequently ephemeral.

Average indicators give helpful context but may require supporting data to
clarify relationships. IP addresses, for instance, are moderately strong for
tracking inter-service calls within controlled environments but are weaker
across public or shared networks where IP reuse is common. URL paths also fall
in this category; they link entities to specific endpoints or service functions
and are moderately strong for tracking interactions between microservices with
known APIs. Port numbers are another average indicator. While they suggest the
service interaction type (HTTP, database), they generally need pairing with IP
addresses or URLs for more accuracy, as port numbers alone are often shared
across different services.

Weak indicators are often too generic to imply a direct relationship but can
suggest possible correlations. Host names, for example, are broad and typically
cover a range of services or applications, especially in large clusters.
Time-based indicators, such as timestamps or TTL values, suggest possible timing
correlations but don’t establish a definitive link on their own. Status codes,
like HTTP 500 errors, indicate issues but don’t specify causality, often
requiring corroboration with stronger indicators like trace or session IDs.

However, weak indicators can become strong when they appear together. For
instance, a combination of IP address, port, and timestamp can strongly suggest
a direct interaction between services, especially when the same combination is
seen repeatedly or in conjunction with related URLs. Similarly, a host name
combined with a unique URL path can strongly suggest that a specific service or
pod is generating particular request patterns, even if each alone is too
general.

## Identifying entity relationships

Your current task is to identify possible entity relationships for the
investigated entity ${formatEntity(entity)}. You will get a document analysis
for the investigated entity, and results from keyword searches that were
extracted from the entity. Based on this data, list entities that could possibly
be related to the given entity. 

## Output

For each possible relationship, describe the following things:
- The related entity (as a key-value pair)
- The indicators you have observed as evidence of the relationship. Include the
strength of the indicator, and the exact pieces of data that are related to it
(field names and values, in both the investigated entity, and the possibly
related entity).
- Reason about the type of relationship, based on the indicators. Consider
how the indicators (as in, in what fields) appear in the investigated entity
and the related entity, and how these fields can help you establish downstream
vs upstream or just related.
- The overall likeliness of it being related to the investigated entity.`;

export async function findRelatedEntitiesViaKeywordSearches({
  connectorId,
  inferenceClient,
  esClient,
  start,
  end,
  values,
  groupingFields,
  index,
  entity,
  dataToAnalyzePrompt,
  logger: parentLogger,
}: {
  connectorId: string;
  inferenceClient: InferenceClient;
  esClient: ObservabilityElasticsearchClient;
  start: number;
  end: number;
  values: Array<{ fragments: string[]; relationship: string }>;
  groupingFields: string[];
  index: string | string[];
  entity: Record<string, string>;
  dataToAnalyzePrompt: string;
  logger: Logger;
}): Promise<{
  content: string;
  foundEntities: RelatedEntityFromSearchResults[];
}> {
  const entityFields = Object.keys(entity);

  const logger = parentLogger.get('findRelatedEntities');

  logger.debug(
    () => `Finding related entities: ${JSON.stringify({ entity, groupingFields, values })}`
  );

  const foundEntities = (
    await Promise.all(
      groupingFields.map((groupingField) => getResultsForGroupingField(groupingField))
    )
  ).flat();

  const system = `${RCA_SYSTEM_PROMPT_BASE}
  
  ${SYSTEM_PROMPT_ENTITIES}
  
  ${SYSTEM_PROMPT_DEPENDENCIES}`;

  const input = getInputPrompt({
    entity,
    dataToAnalyzePrompt,
    foundEntities,
    values,
  });

  const relevantEntities$ = inferenceClient
    .output('describe_relevant_entities', {
      connectorId,
      system,
      input,
    })
    .pipe(withoutOutputUpdateEvents());

  const completeEvent = await lastValueFrom(relevantEntities$);

  return {
    content: completeEvent.content,
    foundEntities,
  };

  async function getResultsForGroupingField(
    groupingField: string
  ): Promise<RelatedEntityFromSearchResults[]> {
    const excludeQuery = isEqual([groupingField], entityFields)
      ? `NOT (${groupingField}:"${entity[groupingField]}")`
      : ``;

    const keywordSearchResults = await esClient.search(
      'find_related_entities_via_keyword_searches',
      {
        track_total_hits: false,
        index,
        query: {
          bool: {
            must: [...rangeQuery(start, end), ...kqlQuery(excludeQuery)],
            should: [
              {
                multi_match: {
                  query: values.flatMap((value) => value.fragments).join(' '),
                  fields: '*',
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
        fields: [groupingField],
        collapse: {
          field: groupingField,
        },
        highlight: {
          fields: {
            '*': {},
          },
        },
        _source: false,
        size: 1_000,
      }
    );

    if (!keywordSearchResults.hits.hits.length) {
      logger.debug(() => `No hits: ${JSON.stringify({ entity, groupingField, values })}`);
      return [];
    }

    logger.debug(
      () =>
        `Hits: ${JSON.stringify({
          entity,
          groupingField,
          values,
          count: keywordSearchResults.hits.hits.length,
          hits: keywordSearchResults.hits.hits,
        })}`
    );

    const limiter = pLimit(20);

    const analysisForGroupingField = await Promise.all(
      keywordSearchResults.hits.hits.map(async (hit) => {
        return limiter(async () => {
          const groupValue = hit.fields![groupingField][0] as string;

          const analysis = await analyzeDocuments({
            esClient,
            start,
            end,
            index,
            kuery: getEntityKuery({
              [groupingField]: groupValue,
            }),
          });

          return {
            groupingField,
            key: groupValue,
            highlight: hit.highlight!,
            analysis: sortAndTruncateAnalyzedFields({
              ...analysis,
              fields: analysis.fields.filter((field) => !field.empty),
            }),
          };
        });
      })
    );

    return analysisForGroupingField.map(({ key, highlight, analysis }) => {
      return {
        entity: {
          [groupingField]: key,
        },
        highlight,
        analysis,
      };
    });
  }
}
