/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { getCaseOutcomeStepCommonDefinition } from '../../../common/workflows/steps/get_case_outcome';
import type { CasesClient } from '../../client';
import { getCaseOutcome } from '../../knowledge/case_outcome';
import { getCasesClientFromStepsContext } from './utils';

export interface GetCaseOutcomeStepDeps {
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>;
  isContextEngineEnabled: (spaceId: string) => Promise<boolean>;
}

/**
 * Builds a closed case's knowledge item for `context-engine.createKi`. Reads the case through the
 * Cases client as the workflow's identity, so Cases privileges apply.
 */
export const getCaseOutcomeStepDefinition = ({
  getCasesClient,
  isContextEngineEnabled,
}: GetCaseOutcomeStepDeps) =>
  createServerStepDefinition({
    ...getCaseOutcomeStepCommonDefinition,
    handler: async (context) => {
      try {
        // A global workflow runs in the space whose event triggered it.
        const spaceId = context.contextManager.getContext().workflow.spaceId;
        const client = await getCasesClientFromStepsContext(context, getCasesClient);
        const output = await getCaseOutcome({
          client,
          caseId: context.input.case_id,
          spaceId,
          isContextEngineEnabled: () => isContextEngineEnabled(spaceId),
        });
        return { output };
      } catch (error) {
        return { error };
      }
    },
  });
