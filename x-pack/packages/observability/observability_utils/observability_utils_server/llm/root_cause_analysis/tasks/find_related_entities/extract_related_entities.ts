/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withoutOutputUpdateEvents } from '@kbn/inference-plugin/server';
import { lastValueFrom } from 'rxjs';
import stringify from 'json-stable-stringify';
import {
  RCA_SYSTEM_PROMPT_BASE,
  RCA_PROMPT_DEPENDENCIES,
  RCA_PROMPT_ENTITIES,
} from '../../prompts';
import { formatEntity } from '../../util/format_entity';
import { RelatedEntityFromSearchResults } from '.';
import { RootCauseAnalysisContext } from '../../types';
import { getPreviouslyInvestigatedEntities } from '../../util/get_previously_investigated_entities';

export interface RelatedEntityDescription {
  entity: Record<string, string>;
  reason: string;
  confidence: string;
}

export async function extractRelatedEntities({
  entity,
  relatedEntitiesSummary,
  summary,
  foundEntities,
  context,
  rcaContext: { events, connectorId, inferenceClient },
}: {
  relatedEntitiesSummary: string;
  foundEntities: RelatedEntityFromSearchResults[];
  entity: Record<string, string>;
  summary: string;
  context: string;
  rcaContext: Pick<RootCauseAnalysisContext, 'events' | 'connectorId' | 'inferenceClient'>;
}): Promise<{ relatedEntities: RelatedEntityDescription[] }> {
  const system = `${RCA_SYSTEM_PROMPT_BASE}
  
  ${RCA_PROMPT_ENTITIES}

  ${RCA_PROMPT_DEPENDENCIES}`;

  const previouslyInvestigatedEntities = getPreviouslyInvestigatedEntities({ events });

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

    # Context

    ${context}

    # Task

    Your current task is to extract relevant entities as a data structure from the
    related entities report. Order them by relevance to the investigation, put the
    most relevant ones first.
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
            related_entities: {
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
                  reason: {
                    type: 'string',
                    description: 'Describe why this entity might be relevant. Provide evidence.',
                  },
                  confidence: {
                    type: 'string',
                    description:
                      'Describe how confident you are in your conclusion about this relationship: low, moderate, high',
                  },
                },

                required: ['entity', 'reason', 'confidence'],
              },
            },
          },
          required: ['related_entities'],
        } as const,
      })
      .pipe(withoutOutputUpdateEvents())
  );

  const foundEntityIds = foundEntities.map(({ entity: foundEntity }) => stringify(foundEntity));

  return {
    relatedEntities: completeEvent.output.related_entities
      .map((relationship): RelatedEntityDescription => {
        return {
          entity: { [relationship.entity.field]: relationship.entity.value },
          reason: relationship.reason,
          confidence: relationship.confidence,
        };
      })
      .filter((relationship) => {
        return foundEntityIds.includes(stringify(relationship.entity));
      }),
  };
}
