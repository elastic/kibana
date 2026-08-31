/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  setExtendedFieldsStepCommonDefinition,
  type SetExtendedFieldsStepInput,
} from '../../../common/workflows/steps/set_extended_fields';
import { CASE_EXTENDED_FIELDS } from '../../../common/constants';
import type { CasesClient } from '../../client';
import { SET_EXTENDED_FIELDS_FAILED_MESSAGE } from './translations';
import { createCasesStepHandler, getErrorMessage, safeParseCaseForWorkflowOutput } from './utils';
import { resolveCaseVersion } from './update_case_helpers';

export const setExtendedFieldsStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...setExtendedFieldsStepCommonDefinition,
    handler: createCasesStepHandler(
      getCasesClient,
      async (casesClient, input: SetExtendedFieldsStepInput) => {
        const version = await resolveCaseVersion(casesClient, input.case_id, input.version);

        // `bulkUpdate` merges `extended_fields` into the case's existing values and emits the
        // `extended_fields` user action. Server-side `validateExtendedFields` is the single typing
        // authority — it rejects unknown keys and values that don't match the field definition.
        const updatedCases = await casesClient.cases.bulkUpdate({
          cases: [
            {
              id: input.case_id,
              version,
              [CASE_EXTENDED_FIELDS]: input.fields,
            },
          ],
        });

        const updatedCase = updatedCases.find((theCase) => theCase.id === input.case_id);
        if (!updatedCase) {
          throw new Error('The case was not returned in the bulk update response');
        }

        return safeParseCaseForWorkflowOutput(
          setExtendedFieldsStepCommonDefinition.outputSchema.shape.case,
          updatedCase
        );
      },
      {
        // Don't swallow the failure: validation errors name the offending key, so surface the
        // underlying message alongside the i18n prefix rather than a generic "could not update".
        onError: (error, input) =>
          new Error(SET_EXTENDED_FIELDS_FAILED_MESSAGE(input.case_id, getErrorMessage(error))),
      }
    ),
  });
