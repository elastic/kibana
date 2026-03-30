/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  addEventsStepCommonDefinition,
  EventArraySchema,
  type AddEventsStepInput,
} from '../../../common/workflows/steps/add_events';
import { AttachmentType } from '../../../common';
import type { CasesClient } from '../../client';
import {
  createCasesStepHandler,
  ensureArrayShape,
  safeParseCaseForWorkflowOutput,
  withCaseOwner,
} from './utils';

export const addEventsStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...addEventsStepCommonDefinition,
    handler: createCasesStepHandler(getCasesClient, async (client, input: AddEventsStepInput) => {
      const inputEvents = ensureArrayShape(input.events, EventArraySchema);
      return withCaseOwner(client, input.case_id, async (owner) => {
        const updatedCase = await client.attachments.bulkCreate({
          caseId: input.case_id,
          attachments: inputEvents.map((event) => ({
            type: AttachmentType.event,
            eventId: event.eventId,
            index: event.index,
            owner,
          })),
        });

        return safeParseCaseForWorkflowOutput(
          addEventsStepCommonDefinition.outputSchema.shape.case,
          updatedCase
        );
      });
    }),
  });
