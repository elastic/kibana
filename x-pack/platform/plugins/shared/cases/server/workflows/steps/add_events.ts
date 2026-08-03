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
} from '../../../common/workflows/steps/add_events';
import type { AttachmentRequestV2 } from '../../../common/types/api';
import type { CasesClient } from '../../client';
import { createCasesStepHandler, safeParseCaseForWorkflowOutput, withCaseOwner } from './utils';
import { LEGACY_EVENT_TYPE } from '../../../common/constants/attachments';
import { toUnifiedAttachmentType } from '../../../common/utils/attachments';

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
        const attachments: AttachmentRequestV2[] = [
          ...groupEventsByIndex(input.events).values(),
        ].map((group) => ({
          type: toUnifiedAttachmentType(LEGACY_EVENT_TYPE, owner),
          attachmentId: group.map((event) => event.eventId),
          metadata: { index: group.map((event) => event.index) },
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
