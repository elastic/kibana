/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  getCaseStepCommonDefinition,
  type GetCaseStepInput,
} from '../../../common/workflows/steps/get_case';
import type { CasesClient } from '../../client';
import { createCasesStepHandler, safeParseCaseForWorkflowOutput } from './utils';

export const getCaseStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...getCaseStepCommonDefinition,
    handler: createCasesStepHandler(getCasesClient, async (client, input: GetCaseStepInput) => {
      // `include_comments` is deprecated and intentionally ignored: comments are always
      // excluded to avoid leaking a silently-mixed legacy/unified `comments[]` array when
      // the unified-attachment feature flag is on.
      const theCase = await client.cases.get({
        id: input.case_id,
        includeComments: false,
      });

      return safeParseCaseForWorkflowOutput(
        getCaseStepCommonDefinition.outputSchema.shape.case,
        theCase
      );
    }),
  });
