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
import { AttachmentType } from '../../../common';
import type { CasesClient } from '../../client';
import { createCasesStepHandler, withCaseOwner } from './utils';

/**
 * Workflows output parsing uses generated OpenAPI schemas that currently model case comments as
 * only `alert` or `user`. Internally, cases can also include other comment types (for example
 * `event`), which fail discriminated-union parsing. We normalize the response by removing
 * unsupported comment types from the parsed output payload.
 *
 * TODO: remove this once generated workflow output schemas include all supported case comment types.
 */
const normalizeCommentsForWorkflowOutput = (outputCase: unknown) => {
  if (
    outputCase == null ||
    typeof outputCase !== 'object' ||
    !('comments' in outputCase) ||
    !Array.isArray(outputCase.comments)
  ) {
    return outputCase;
  }

  return {
    ...outputCase,
    comments: outputCase.comments.filter(
      (comment) =>
        comment != null &&
        typeof comment === 'object' &&
        'type' in comment &&
        (comment.type === AttachmentType.alert || comment.type === AttachmentType.user)
    ),
  };
};

export const addEventsStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...addEventsStepCommonDefinition,
    handler: createCasesStepHandler(getCasesClient, async (client, input: AddEventsStepInput) => {
      return withCaseOwner(client, input.case_id, async (owner) => {
        const updatedCase = await client.attachments.bulkCreate({
          caseId: input.case_id,
          attachments: input.events.map((event) => ({
            type: AttachmentType.event,
            eventId: event.eventId,
            index: event.index,
            owner,
          })),
        });

        const normalizedOutputCase = normalizeCommentsForWorkflowOutput(updatedCase);
        return addEventsStepCommonDefinition.outputSchema.shape.case.parse(normalizedOutputCase);
      });
    }),
  });
