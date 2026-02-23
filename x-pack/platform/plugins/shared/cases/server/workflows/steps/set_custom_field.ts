/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  setCustomFieldStepCommonDefinition,
  type SetCustomFieldStepInput,
} from '../../../common/workflows/steps/set_custom_field';
import type { CasesClient } from '../../client';
import { SET_CUSTOM_FIELD_FAILED_MESSAGE } from './translations';
import { createCasesStepHandler } from './utils';

export const setCustomFieldStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...setCustomFieldStepCommonDefinition,
    handler: createCasesStepHandler(
      getCasesClient,
      async (casesClient, input: SetCustomFieldStepInput) => {
        try {
          const currentCase = await casesClient.cases.get({
            id: input.case_id,
            includeComments: false,
          });

          await casesClient.cases.replaceCustomField({
            caseId: input.case_id,
            customFieldId: input.field_name,
            request: {
              caseVersion: currentCase.version,
              value: input.value,
            },
          });

          const updatedCase = await casesClient.cases.get({
            id: input.case_id,
            includeComments: false,
          });

          return setCustomFieldStepCommonDefinition.outputSchema.shape.case.parse(updatedCase);
        } catch {
          throw new Error(SET_CUSTOM_FIELD_FAILED_MESSAGE(input.case_id, input.field_name));
        }
      }
    ),
  });
