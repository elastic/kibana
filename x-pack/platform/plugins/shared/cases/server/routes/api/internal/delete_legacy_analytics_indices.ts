/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DELETE_LEGACY_ANALYTICS_INDICES_API_TAG } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';

export const DELETE_LEGACY_ANALYTICS_INDICES_INTERNAL_URL =
  '/internal/cases/_analytics/legacy_indices';

/**
 * Pattern that matches every concrete and aliased index produced by the
 * legacy reindex pipeline (cases_index, comments_index, attachments_index,
 * activity_index — all with the `.cases-analytics` and `.internal.cases-`
 * naming family). Wide enough to cover any prior shape; restrictive
 * enough to never touch unrelated indices.
 */
const LEGACY_INDEX_PATTERN = '.cases-analytics*,.internal.cases-analytics*,.internal.cases.*';

export interface DeleteLegacyAnalyticsIndicesResponse {
  deletedIndices: string[];
  /** Names of any transforms removed (lifecycle pivot from PR 257780). */
  deletedTransforms: string[];
}

/**
 * DELETE /internal/cases/_analytics/legacy_indices — operator-triggered
 * cleanup for clusters that previously ran the analytics-indices path
 * and have since switched to ES|QL views. Never auto-runs.
 */
export const deleteLegacyAnalyticsIndicesRoute = createCasesRoute({
  method: 'delete',
  path: DELETE_LEGACY_ANALYTICS_INDICES_INTERNAL_URL,
  security: {
    authz: {
      requiredPrivileges: [DELETE_LEGACY_ANALYTICS_INDICES_API_TAG],
    },
  },
  routerOptions: {
    access: 'internal',
  },
  handler: async ({ context, response }) => {
    try {
      const coreContext = await context.core;
      const esClient = coreContext.elasticsearch.client.asInternalUser;

      const indicesResponse = await esClient.indices.get({
        index: LEGACY_INDEX_PATTERN,
        allow_no_indices: true,
        ignore_unavailable: true,
      });
      const indexNames = Object.keys(indicesResponse);
      if (indexNames.length > 0) {
        await esClient.indices.delete({
          index: indexNames,
          ignore_unavailable: true,
        });
      }

      // Lifecycle transform from PR #257780 — names match
      // `.cases-analytics-lifecycle.elastic-*`. We ignore failures for
      // the get/delete pair so a missing transform does not 500 the
      // route; the contract is "remove if present".
      const deletedTransforms: string[] = [];
      try {
        const transforms = await esClient.transform.getTransform({
          transform_id: 'cases-analytics-lifecycle-*',
          allow_no_match: true,
        });
        for (const t of transforms.transforms ?? []) {
          await esClient.transform.stopTransform({
            transform_id: t.id,
            allow_no_match: true,
            wait_for_completion: true,
            force: true,
          });
          await esClient.transform.deleteTransform({
            transform_id: t.id,
            force: true,
          });
          deletedTransforms.push(t.id);
        }
      } catch (transformErr) {
        // The transform endpoint may 404 if the cluster never had a
        // transform installed. Surface as deletedTransforms=[] rather
        // than a route failure.
      }

      const body: DeleteLegacyAnalyticsIndicesResponse = {
        deletedIndices: indexNames,
        deletedTransforms,
      };
      return response.ok({ body });
    } catch (error) {
      throw createCaseError({
        message: `Failed to delete legacy cases analytics artifacts: ${error}`,
        error,
      });
    }
  },
});
