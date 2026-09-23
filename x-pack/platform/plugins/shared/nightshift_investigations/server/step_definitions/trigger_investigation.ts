/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { INVESTIGATION_TRIGGER_TYPES } from '../../common';
import type { GetInvestigationsClient } from '../routes/types';

const inputSchema = z.object({
  subject_type: z
    .enum(['significant_event', 'alert'])
    .describe('The type of entity being investigated'),
  subject_id: z.string().min(1).describe('The ID of the entity being investigated'),
  trigger_type: z
    .enum(INVESTIGATION_TRIGGER_TYPES)
    .optional()
    .describe('What initiated this investigation. Defaults to "automatic".'),
  summary: z
    .string()
    .max(MAX_TEXT_LENGTH)
    .optional()
    .describe('Short description of the subject, returned on reads as subject.summary'),
  concurrency_key: z
    .string()
    .optional()
    .describe(
      'Caller key for cancel-and-replace concurrency control (maps to concurrencyGroupKey)'
    ),
  context: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'Additional context to pass to the investigation workflow. When subject_type is "alert" this must carry an "alerts" array of alert snapshots, or the investigation is rejected.'
    ),
});

export const triggerInvestigationStepDefinition = (
  getInvestigationsClient: GetInvestigationsClient
) =>
  createServerStepDefinition({
    id: 'nightshift.triggerInvestigation',
    label: 'Trigger Nightshift Investigation',
    category: StepCategory.Ai,
    description:
      'Start an investigation for a given subject (significant event, alert, or other entity). Returns investigation_id for tracking.',
    inputSchema,
    outputSchema: z.object({
      investigation_id: z
        .string()
        .describe('The workflow execution ID for the started investigation'),
    }),
    handler: async (context) => {
      const request = context.contextManager.getFakeRequest();
      // getFakeRequest() does not carry space info, so the space ID must be extracted from the
      // workflow context explicitly. See https://github.com/elastic/kibana/issues/284786.
      const spaceId = context.contextManager.getContext().workflow.spaceId;
      const client = getInvestigationsClient(request, spaceId);
      const input = inputSchema.parse(context.input);
      const result = await client.start({
        subject: {
          type: input.subject_type,
          id: input.subject_id,
          summary: input.summary,
        },
        trigger_type: input.trigger_type ?? 'automatic',
        concurrency_key: input.concurrency_key,
        context: input.context,
      });
      return { output: result };
    },
  });
