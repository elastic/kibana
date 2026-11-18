/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { verifyOntologyJoinsStepCommonDefinition } from '../../common/step_types/verify_ontology_joins';
import { verifyOntologyJoins } from '../ontology/joins';
import type { DreamingStepDependencies } from './helpers';
import { getAiIndexForStep } from './ontology_helpers';

/** Keeps the ontology join candidates the data confirms, reading as the workflow user. */
export const getVerifyOntologyJoinsStepDefinition = (deps: DreamingStepDependencies) =>
  createServerStepDefinition({
    ...verifyOntologyJoinsStepCommonDefinition,
    handler: async (context) => {
      const { spaceId } = context.contextManager.getContext().workflow;
      const { ai_index_id: aiIndexId, catalog, candidates } = context.input;
      const aiIndex = await getAiIndexForStep(deps, {
        request: context.contextManager.getFakeRequest(),
        aiIndexId,
        spaceId,
      });
      if (!aiIndex) {
        return { output: { verified: [], rejected: [] } };
      }
      const output = await verifyOntologyJoins({
        esClient: context.contextManager.getScopedEsClient(),
        catalog,
        candidates,
        abortSignal: context.abortSignal,
      });
      return { output };
    },
  });
