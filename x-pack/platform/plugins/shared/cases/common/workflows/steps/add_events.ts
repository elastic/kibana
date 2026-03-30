/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import * as i18n from '../translations';
import {
  CasesStepBaseConfigSchema,
  CasesStepCaseIdSchema,
  CasesStepSingleCaseOutputSchema,
} from './shared';
import { MAX_BULK_CREATE_ATTACHMENTS } from '../../constants';

export const AddEventsStepTypeId = 'cases.addEvents';

const EventInputSchema = z.object({
  eventId: z.string().min(1, 'eventId is required'),
  index: z.string().min(1, 'index is required'),
});

const InputSchema = CasesStepCaseIdSchema.extend({
  events: z.array(EventInputSchema).min(1).max(MAX_BULK_CREATE_ATTACHMENTS),
});

const OutputSchema = CasesStepSingleCaseOutputSchema;

type AddEventsStepInputSchema = typeof InputSchema;
type AddEventsStepOutputSchema = typeof OutputSchema;

export type AddEventsStepInput = z.infer<typeof InputSchema>;

export const addEventsStepCommonDefinition: CommonStepDefinition<
  AddEventsStepInputSchema,
  AddEventsStepOutputSchema
> = {
  id: AddEventsStepTypeId,
  category: StepCategory.Kibana,
  label: i18n.ADD_EVENTS_STEP_LABEL,
  description: i18n.ADD_EVENTS_STEP_DESCRIPTION,
  documentation: {
    details: i18n.ADD_EVENTS_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Add events to case
\`\`\`yaml
- name: add_events
  type: ${AddEventsStepTypeId}
  with:
    case_id: "abc-123-def-456"
    events:
      - eventId: "event-1"
        index: ".ds-logs-*"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: CasesStepBaseConfigSchema,
};
