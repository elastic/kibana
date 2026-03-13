/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
import { CaseResponseProperties } from '../../bundled-types.gen';

export const CaseCreatedTriggerId = 'cases.caseCreated' as const;

export const caseCreatedEventSchema = z.object({
  case: CaseResponseProperties.describe('The created case.'),
});

export type CaseCreatedEvent = z.infer<typeof caseCreatedEventSchema>;

export const caseCreatedTriggerCommonDefinition: CommonTriggerDefinition = {
  id: CaseCreatedTriggerId,
  eventSchema: caseCreatedEventSchema,
};
