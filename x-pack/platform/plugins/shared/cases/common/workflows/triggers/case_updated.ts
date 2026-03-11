/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
import { CaseResponseProperties } from '../../bundled-types.gen';

export const CaseUpdatedTriggerId = 'cases.caseUpdated' as const;

export const caseUpdatedEventSchema = z.object({
  case: CaseResponseProperties.describe('The updated case.'),
  updatedFields: z
    .array(z.string())
    .optional()
    .describe('A list of case fields updated by this operation.'),
});

export type CaseUpdatedEvent = z.infer<typeof caseUpdatedEventSchema>;

export const caseUpdatedTriggerCommonDefinition: CommonTriggerDefinition = {
  id: CaseUpdatedTriggerId,
  eventSchema: caseUpdatedEventSchema,
};
