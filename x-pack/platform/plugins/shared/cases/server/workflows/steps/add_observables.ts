/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  addObservablesStepCommonDefinition,
  type AddObservablesStepInput,
} from '../../../common/workflows/steps/add_observables';
import type { CasesClient } from '../../client';
import { ADD_OBSERVABLES_FAILED_MESSAGE } from './translations';
import { createCasesStepHandler } from './utils';

export const addObservablesStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...addObservablesStepCommonDefinition,
    handler: createCasesStepHandler(
      getCasesClient,
      async (client, input: AddObservablesStepInput) => {
        const updatedCase = await client.cases.bulkAddObservables({
          caseId: input.case_id,
          observables: input.observables.map((observable) => ({
            typeKey: observable.typeKey,
            value: observable.value,
            description: observable.description ?? null,
          })),
        });

        return addObservablesStepCommonDefinition.outputSchema.shape.case.parse(updatedCase);
      },
      {
        onError: (_error, input: AddObservablesStepInput) =>
          new Error(ADD_OBSERVABLES_FAILED_MESSAGE(input.case_id)),
      }
    ),
  });
