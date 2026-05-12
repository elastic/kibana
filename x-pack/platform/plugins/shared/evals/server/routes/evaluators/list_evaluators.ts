/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS, EVALS_INTERNAL_URL, INTERNAL_API_ACCESS } from '@kbn/evals-common';
import { PLUGIN_ID } from '../../../common';
import { EvaluatorClient } from '../../storage/evaluator_client';
import type { EvaluatorRouteDependencies } from '.';

const EVALS_EVALUATORS_URL = `${EVALS_INTERNAL_URL}/evaluators` as const;

export const registerListEvaluatorsRoute = ({
  router,
  evaluatorRegistry,
}: EvaluatorRouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_EVALUATORS_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'List all registered evaluators',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {},
      },
      async (context, _request, response) => {
        const now = new Date().toISOString();

        // Get prebuilt evaluators from registry
        const prebuiltEvaluators = evaluatorRegistry
          .getAll()
          .filter((e) => e.source === 'prebuilt')
          .map((e) => ({
            id: e.name,
            name: e.name,
            kind: e.kind,
            type: 'prebuilt' as const,
            description: e.description,
            source: e.source,
            usage_count: 0,
            version: 1,
            tags: [],
            created_at: now,
            updated_at: now,
          }));

        // Get custom evaluators from saved objects for richer data
        let customEvaluators: Array<{
          id: string;
          name: string;
          kind: string;
          type: string;
          description: string;
          source: string;
          usage_count: number;
          version: number;
          tags: Record<string, string>;
          shared: boolean;
          created_at: string;
          updated_at: string;
        }> = [];

        try {
          const coreContext = await context.core;
          const soClient = coreContext.savedObjects.client;
          const evaluatorClient = new EvaluatorClient(soClient);
          const findResult = await evaluatorClient.find();

          customEvaluators = findResult.saved_objects.map((so) => ({
            id: so.id,
            name: so.attributes.name,
            kind: so.attributes.kind,
            type: so.attributes.type,
            description: so.attributes.description,
            source: 'custom',
            usage_count: 0,
            version: so.attributes.version,
            tags: so.attributes.tags,
            shared: so.attributes.shared,
            created_at: so.attributes.created_at,
            updated_at: so.attributes.updated_at,
          }));
        } catch (_error) {
          // Fall back to in-memory custom evaluators if SO query fails
          const inMemoryCustom = evaluatorRegistry
            .getAll()
            .filter((e) => e.source === 'custom')
            .map((e) => ({
              id: e.name,
              name: e.name,
              kind: e.kind,
              type: 'code' as const,
              description: e.description,
              source: e.source,
              usage_count: 0,
              version: 1,
              tags: {} as Record<string, string>,
              shared: false,
              created_at: now,
              updated_at: now,
            }));
          customEvaluators = inMemoryCustom;
        }

        const evaluators = [...prebuiltEvaluators, ...customEvaluators];

        return response.ok({
          body: { evaluators, total: evaluators.length },
        });
      }
    );
};
