/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound } from '@hapi/boom';
import { z } from '@kbn/zod/v4';
import { diffDecisionTrees, parseMermaidDecisionTree, symptomTreeId } from '@kbn/nightshift-decision-trees';
import { MAX_KEYWORD_LENGTH } from '../../common';
import type { DecisionTreeVersionDetail } from '../../common/decision_trees';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

export const getDecisionTreeVersionRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/decision_trees/{symptom}/versions/{version}',
  options: {
    access: 'internal',
    summary: 'Get a decision tree version',
    description:
      'Returns a single decision-tree version, with the node/edge diff against its predecessor.',
  },
  security: {
    authz: { requiredPrivileges: ['agentBuilder:read'] },
  },
  params: z.object({
    path: z.object({
      symptom: z.string().min(1).max(MAX_KEYWORD_LENGTH),
      version: z.coerce.number().int().positive(),
    }),
  }),
  handler: async ({ request, params, getDecisionTreeStore, isDecisionTreesEnabled }) => {
    if (!isDecisionTreesEnabled()) throw notFound('Decision trees are not enabled');

    const treeId = symptomTreeId(params.path.symptom);
    const { version: versionNumber } = params.path;
    const store = getDecisionTreeStore(request);

    const version = await store.getVersion(treeId, versionNumber);
    if (!version) {
      throw notFound(`Decision tree ${params.path.symptom} version ${versionNumber} was not found`);
    }

    // v1 has no predecessor, so it carries no diff.
    let withDiff: DecisionTreeVersionDetail = version;
    if (versionNumber > 1) {
      const previous = await store.getVersion(treeId, versionNumber - 1);
      if (previous) {
        withDiff = {
          ...version,
          diff: diffDecisionTrees(
            parseMermaidDecisionTree(previous.mermaid, treeId),
            parseMermaidDecisionTree(version.mermaid, treeId)
          ),
        };
      }
    }

    return { version: withDiff };
  },
});
