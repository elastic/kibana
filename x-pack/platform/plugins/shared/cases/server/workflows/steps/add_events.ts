/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { EventAttachmentPayload } from '../../../common/types/domain';
import {
  addEventsStepCommonDefinition,
  type AddEventsStepInput,
} from '../../../common/workflows/steps/add_events';
import { AttachmentType } from '../../../common';
import type { CasesClient } from '../../client';
import { createCasesStepHandler, safeParseCaseForWorkflowOutput, withCaseOwner } from './utils';

const groupEventsByIndex = (
  events: AddEventsStepInput['events']
): Map<string, AddEventsStepInput['events']> => {
  const groups = new Map<string, AddEventsStepInput['events']>();
  for (const event of events) {
    const key = event.index;
    const existing = groups.get(key);
    if (existing) {
      existing.push(event);
    } else {
      groups.set(key, [event]);
    }
  }
  return groups;
};

export const addEventsStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...addEventsStepCommonDefinition,
    handler: createCasesStepHandler(getCasesClient, async (client, input: AddEventsStepInput) => {
      return withCaseOwner(client, input.case_id, async (owner) => {
        const attachments: EventAttachmentPayload[] = [
          ...groupEventsByIndex(input.events).values(),
        ].map((group) => ({
          type: AttachmentType.event,
          eventId: group.map((event) => event.eventId),
          index: group.map((event) => event.index),
          owner,
        }));

        const updatedCase = await client.attachments.bulkCreate({
          caseId: input.case_id,
          attachments,
        });

        return safeParseCaseForWorkflowOutput(
          addEventsStepCommonDefinition.outputSchema.shape.case,
          updatedCase
        );
      });
    }),
  });
