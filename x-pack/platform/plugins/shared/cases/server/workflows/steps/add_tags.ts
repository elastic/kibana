/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  addTagsStepCommonDefinition,
  type AddTagsStepInput,
} from '../../../common/workflows/steps/add_tags';
import type { CasesClient } from '../../client';
import { createCasesStepHandler } from './utils';
import { updateSingleCaseFromInput } from './update_case_helpers';

export const addTagsStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...addTagsStepCommonDefinition,
    handler: createCasesStepHandler(getCasesClient, async (client, input: AddTagsStepInput) => {
      const currentCase = await client.cases.get({
        id: input.case_id,
        includeComments: false,
      });

      const tags = [...new Set([...(currentCase.tags ?? []), ...input.tags])];

      return updateSingleCaseFromInput(
        client,
        { ...input, version: currentCase.version },
        { tags }
      );
    }),
  });
