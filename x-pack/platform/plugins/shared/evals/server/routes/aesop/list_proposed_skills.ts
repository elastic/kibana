/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { IRouter } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/evals-common';
import type { EvalsRequestHandlerContext } from '../../types';

const listProposedSkillsQuerySchema = z.object({
  status: z.enum(['all', 'pending_review', 'passed', 'failed']).optional().default('all'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export function registerListProposedSkillsRoute(router: IRouter<EvalsRequestHandlerContext>) {
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
        const { elasticsearch } = context.core;
        const esClient = elasticsearch.client.asCurrentUser;

        try {
          const { status, limit, offset } = request.query;

          // Build query filter based on status
          const mustClauses: any[] = [];

          if (status !== 'all') {
            if (status === 'passed' || status === 'failed') {
              mustClauses.push({ term: { 'validation.status': status } });
            } else if (status === 'pending_review') {
              mustClauses.push({
                bool: {
                  must: [
                    { term: { 'validation.status': 'passed' } },
                    { term: { 'review.status': 'pending_review' } },
                  ],
                },
              });
            }
          }

          // Query .aesop-proposed-skills index
          const result = await esClient.search({
            index: '.aesop-proposed-skills',
            body: {
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
            },
          });

          const skills = result.hits.hits.map((hit) => ({
            id: hit._id,
            ...hit._source,
          }));

          return response.ok({
            body: {
              skills,
              total: result.hits.total.value,
              limit,
              offset,
            },
          });
        } catch (error) {
          context.logger.error('[AESOP] Failed to list proposed skills', { error });

          return response.customError({
            statusCode: 500,
            body: {
              message: `Failed to list proposed skills: ${error.message}`,
            },
          });
        }
      }
    );
}
