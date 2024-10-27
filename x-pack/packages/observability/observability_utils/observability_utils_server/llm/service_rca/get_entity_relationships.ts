/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceClient, withoutOutputUpdateEvents } from '@kbn/inference-plugin/server';
import { lastValueFrom } from 'rxjs';
import stringify from 'json-stable-stringify';
import {
  RCA_SYSTEM_PROMPT_BASE,
  SYSTEM_PROMPT_DEPENDENCIES,
  SYSTEM_PROMPT_ENTITIES,
} from './system_prompt_base';
import { formatEntity } from './format_entity';
import { RelatedEntityFromSearchResults } from './find_related_entities_via_keyword_searches';

export interface EntityRelationshipDescription {
  entity: Record<string, string>;
  relationship: {
    kind: string;
    confidence: string;
  };
  investigate?: {
    reason: string;
  };
}

export async function getEntityRelationships({
  connectorId,
  inferenceClient,
  entity,
  relatedEntitiesSummary,
  summary,
  previouslyInvestigatedEntities,
  foundEntities,
}: {
  inferenceClient: InferenceClient;
  connectorId: string;
  relatedEntitiesSummary: string;
  foundEntities: RelatedEntityFromSearchResults[];
  entity: Record<string, string>;
  summary: string;
  previouslyInvestigatedEntities: Array<Record<string, string>>;
}): Promise<{ relationships: EntityRelationshipDescription[] }> {
  const system = `${RCA_SYSTEM_PROMPT_BASE}
  
  ${SYSTEM_PROMPT_ENTITIES}

  ${SYSTEM_PROMPT_DEPENDENCIES}`;

  const previouslyInvestigatedEntitiesPrompt = previouslyInvestigatedEntities.length
    ? `## Previously investigated entities

    ${previouslyInvestigatedEntities
      .map((prevEntity) => `- ${formatEntity(prevEntity)}`)
      .join('\n')}`
    : '';

  const input = `
    # Investigated entity

    ${formatEntity(entity)}

    # Report

    ${summary}

    # Related entities report

    ${relatedEntitiesSummary}
    
    ${previouslyInvestigatedEntitiesPrompt}

    # Task

    Your current task is to A) extract entity relationships and B) suggest entities
    to investigate. Do not suggest entities that have previously been investigated.

    When deciding what should be investigated, take the report into account
  `;

  const completeEvent = await lastValueFrom(
    inferenceClient
      .output('get_entity_relationships', {
        connectorId,
        system,
        input,
        schema: {
          type: 'object',
          properties: {
            relationships: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  entity: {
                    type: 'object',
                    properties: {
                      field: {
                        type: 'string',
                      },
                      value: {
                        type: 'string',
                      },
                    },
                    required: ['field', 'value'],
                  },
                  relationship: {
                    type: 'object',
                    properties: {
                      kind: {
                        type: 'string',
                        description:
                          'The kind of relationship, such upstream, downstream, orchestrated-by, runs-on, etc',
                      },
                      confidence: {
                        type: 'string',
                        description:
                          'The level of confidence you have in this being a relationship, based on the data. One of high, moderate, low',
                      },
                    },
                    required: ['kind', 'confidence'],
                  },
                  investigate: {
                    type: 'object',
                    properties: {
                      reason: {
                        type: 'string',
                        description:
                          'If the entity should be investigated, describe the reason why',
                      },
                    },
                  },
                },

                required: ['entity', 'relationship'],
              },
            },
          },
          required: ['relationships'],
        } as const,
      })
      .pipe(withoutOutputUpdateEvents())
  );

  const foundEntityIds = foundEntities.map(({ entity: foundEntity }) => stringify(foundEntity));

  return {
    relationships: completeEvent.output.relationships
      .map((relationship): EntityRelationshipDescription => {
        return {
          entity: { [relationship.entity.field]: relationship.entity.value },
          ...(relationship.investigate?.reason
            ? {
                investigate: {
                  reason: relationship.investigate.reason,
                },
              }
            : {}),
          relationship: {
            confidence: relationship.relationship.confidence,
            kind: relationship.relationship.kind,
          },
        };
      })
      .filter((relationship) => {
        return foundEntityIds.includes(stringify(relationship.entity));
      }),
  };
}
