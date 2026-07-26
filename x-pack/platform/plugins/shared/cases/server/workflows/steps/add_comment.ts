/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  addCommentStepCommonDefinition,
  type AddCommentStepInput,
} from '../../../common/workflows/steps/add_comment';
import { AttachmentType } from '../../../common';
import type { CasesClient } from '../../client';
import { createCasesStepHandler, safeParseCaseForWorkflowOutput, withCaseOwner } from './utils';

export const addCommentStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...addCommentStepCommonDefinition,
    handler: createCasesStepHandler(getCasesClient, async (client, input: AddCommentStepInput) => {
      return withCaseOwner(client, input.case_id, async (owner) => {
        const updatedCase = await client.attachments.add({
          caseId: input.case_id,
          comment: {
            type: AttachmentType.user,
            comment: input.comment,
            owner,
          },
        });

        return safeParseCaseForWorkflowOutput(
          addCommentStepCommonDefinition.outputSchema.shape.case,
          updatedCase
        );
      });
    }),
  });
