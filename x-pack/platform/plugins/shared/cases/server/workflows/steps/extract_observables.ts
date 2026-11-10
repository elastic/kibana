/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { extractObservablesStepCommonDefinition } from '../../../common/workflows/steps/extract_observables';
import type { CasesClient } from '../../client';
import { EXTRACT_OBSERVABLES_FAILED_MESSAGE } from './translations';
import {
  getCasesClientFromStepsContext,
  getErrorMessage,
  safeParseCaseForWorkflowOutput,
} from './utils';

export const extractObservablesStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...extractObservablesStepCommonDefinition,
    handler: async (context) => {
      const { case_id } = context.input;

      try {
        const casesClient = await getCasesClientFromStepsContext(context, getCasesClient);
        const {
          case: updatedCase,
          status,
          newObservablesCount,
          alertsRequested,
          alertsFound,
        } = await casesClient.cases.extractObservables(case_id);

        return {
          output: {
            case: safeParseCaseForWorkflowOutput(
              extractObservablesStepCommonDefinition.outputSchema.shape.case,
              updatedCase
            ),
            status,
            new_observables_count: newObservablesCount,
            alerts_requested: alertsRequested,
            alerts_found: alertsFound,
          },
        };
      } catch (error) {
        return {
          error: new Error(EXTRACT_OBSERVABLES_FAILED_MESSAGE(case_id, getErrorMessage(error))),
        };
      }
    },
  });
