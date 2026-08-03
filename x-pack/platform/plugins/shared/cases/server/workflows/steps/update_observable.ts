/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  updateObservableStepCommonDefinition,
  type UpdateObservableStepInput,
} from '../../../common/workflows/steps/update_observable';
import type { CasesClient } from '../../client';
import { createCasesStepHandler, safeParseCaseForWorkflowOutput } from './utils';

export const updateObservableStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...updateObservableStepCommonDefinition,
    handler: createCasesStepHandler(
      getCasesClient,
      async (client, input: UpdateObservableStepInput) => {
        const updatedCase = await client.cases.updateObservable(
          input.case_id,
          input.observable_id,
          {
            observable: {
              value: input.value,
              description: input.description ?? null,
            },
          }
        );

        return safeParseCaseForWorkflowOutput(
          updateObservableStepCommonDefinition.outputSchema.shape.case,
          updatedCase
        );
      }
    ),
  });
