/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/evals-common';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { AESOPRouteDependencies } from './register_aesop_routes';

interface EsIndexNotFoundError {
  meta?: { body?: { error?: { type?: string } } };
}

const listProposedSkillsQuerySchema = z.object({
  status: z.enum(['all', 'pending_review', 'passed', 'failed']).optional().default('all'),
  derived_from: z
    .enum(['all', 'patterns', 'relationships', 'conversations', 'llm', 'skill_improvement'])
    .optional()
    .default('all'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export function registerListProposedSkillsRoute({ router, logger }: AESOPRouteDependencies) {
  router.versioned
    .get({
      path: '/internal/aesop/skills/proposed',
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['evals'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: buildRouteValidationWithZod(listProposedSkillsQuerySchema),
          },
        },
      },
      async (context, request, response) => {
        const coreContext = await context.core;
        const esClient = coreContext.elasticsearch.client.asCurrentUser;

        try {
          const { status, derived_from, limit, offset } = request.query;

          // Build query filter based on status and derived_from
          const mustClauses: QueryDslQueryContainer[] = [];

          if (derived_from !== 'all') {
            mustClauses.push({ term: { derived_from } });
          }

          if (status !== 'all') {
            if (status === 'passed' || status === 'failed') {
              mustClauses.push({ term: { 'validation.status': status } });
            } else if (status === 'pending_review') {
              mustClauses.push({ term: { 'review.status': 'pending_review' } });
            }
          }

          // Query .aesop-proposed-skills index
          let result;
          try {
            result = await esClient.search({
              index: '.aesop-proposed-skills',
              query: {
                bool: {
                  must: mustClauses.length > 0 ? mustClauses : [{ match_all: {} }],
                },
              },
              sort: [
                { 'metadata.created_at': { order: 'desc' } },
                { confidence: { order: 'desc' } },
              ],
              from: offset,
              size: limit,
            });
          } catch (error) {
            // Index doesn't exist yet - return empty list (exploration hasn't run)
            const esError = error as EsIndexNotFoundError | undefined;
            if (esError?.meta?.body?.error?.type === 'index_not_found_exception') {
              logger.debug('[AESOP] Index .aesop-proposed-skills not found - returning empty list');
              return response.ok({
                body: {
                  skills: [],
                  total: 0,
                  limit,
                  offset,
                },
              });
            }
            throw error; // Re-throw other errors
          }

          const skills = result.hits.hits.map((hit) => ({
            id: hit._id,
            ...(hit._source as Record<string, unknown>),
          }));

          return response.ok({
            body: {
              skills,
              total:
                typeof result.hits.total === 'number'
                  ? result.hits.total
                  : result.hits.total?.value ?? 0,
              limit,
              offset,
            },
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error(
            `[AESOP] Failed to list proposed skills error=${
              error instanceof Error ? error.message : String(error)
            }`
          );

          return response.customError({
            statusCode: 500,
            body: {
              message: `Failed to list proposed skills: ${errorMessage}`,
            },
          });
        }
      }
    );
}
