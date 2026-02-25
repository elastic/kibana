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
  type AddEventsStepInput,
  type AddEventsStepOutput,
} from '../../../common/workflows/steps/add_events';
import { AttachmentType } from '../../../common';
import type { CasesClient } from '../../client';
import { ADD_EVENTS_FAILED_MESSAGE } from './translations';
import { createCasesStepHandler } from './utils';

export const addEventsStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...addEventsStepCommonDefinition,
    handler: createCasesStepHandler(
      getCasesClient,
      async (client, input: AddEventsStepInput) => {
        const theCase = await client.cases.get({
          id: input.case_id,
          includeComments: false,
        });

        const updatedCase = await client.attachments.bulkCreate({
          caseId: input.case_id,
          attachments: input.events.map((event) => ({
            type: AttachmentType.event,
            eventId: event.eventId,
            index: event.index,
            owner: theCase.owner,
          })),
        });

        return updatedCase as AddEventsStepOutput['case'];
      },
      {
        onError: (_error, input: AddEventsStepInput) => new Error(ADD_EVENTS_FAILED_MESSAGE(input.case_id)),
      }
    ),
  });
