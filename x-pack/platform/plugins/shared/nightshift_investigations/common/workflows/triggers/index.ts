/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';

export const INVESTIGATION_SUBJECT_TYPES = ['significant_event', 'alert', 'manual'] as const;
export type InvestigationSubjectType = (typeof INVESTIGATION_SUBJECT_TYPES)[number];

export const INVESTIGATION_STARTED_TRIGGER_ID = 'nightshift-investigations.started' as const;
export const INVESTIGATION_COMPLETED_TRIGGER_ID = 'nightshift-investigations.completed' as const;
export const INVESTIGATION_FAILED_TRIGGER_ID = 'nightshift-investigations.failed' as const;

export const EMITTED_INVESTIGATION_STATUSES = ['running', 'completed', 'failed'] as const;

const subjectSchema = z.object({
  type: z
    .enum(INVESTIGATION_SUBJECT_TYPES)
    .describe('Kind of entity being investigated. "manual" for runs without a subject.'),
  id: z.string().describe('Identifier of the investigated entity. Empty for manual runs.'),
});

const baseInvestigationSchema = z.object({
  investigation_id: z.string().describe('ID of the investigation (the workflow execution ID).'),
  status: z
    .enum(EMITTED_INVESTIGATION_STATUSES)
    .describe('Lifecycle status of the investigation at emit time.'),
  subject: subjectSchema.describe('The entity this investigation is about.'),
  started_at: z.string().describe('When the investigation started (ISO 8601 timestamp).'),
});

export type InvestigationsTriggerBasePayload = z.infer<typeof baseInvestigationSchema>;

const startedSchema = baseInvestigationSchema.extend({
  status: z.literal('running').describe('Always "running" for this trigger.'),
});

const completedSchema = baseInvestigationSchema.extend({
  status: z.literal('completed').describe('Always "completed" for this trigger.'),
  completed_at: z.string().describe('When the investigation finished (ISO 8601 timestamp).'),
});

const failedSchema = baseInvestigationSchema.extend({
  status: z.literal('failed').describe('Always "failed" for this trigger.'),
  completed_at: z.string().describe('When the investigation finished (ISO 8601 timestamp).'),
});

export type InvestigationStartedTriggerPayload = z.infer<typeof startedSchema>;
export type InvestigationCompletedTriggerPayload = z.infer<typeof completedSchema>;
export type InvestigationFailedTriggerPayload = z.infer<typeof failedSchema>;

export interface InvestigationsTriggerPayloadMap {
  [INVESTIGATION_STARTED_TRIGGER_ID]: InvestigationStartedTriggerPayload;
  [INVESTIGATION_COMPLETED_TRIGGER_ID]: InvestigationCompletedTriggerPayload;
  [INVESTIGATION_FAILED_TRIGGER_ID]: InvestigationFailedTriggerPayload;
}

export type InvestigationsTriggerId = keyof InvestigationsTriggerPayloadMap;

const notifyExample = (messageLine: string): string => `## Notify on a lifecycle change
\`\`\`yaml
triggers:
  - type: {triggerId}
steps:
  - name: notify
    type: action.slack
    with:
      message: "${messageLine}"
\`\`\``;

export const investigationStartedTriggerCommonDefinition: CommonTriggerDefinition = {
  id: INVESTIGATION_STARTED_TRIGGER_ID,
  stability: 'tech_preview',
  eventSchema: startedSchema,
  title: i18n.translate('xpack.nightshift.workflowTriggers.investigationStarted.title', {
    defaultMessage: 'Nightshift investigations - Investigation started',
  }),
  description: i18n.translate(
    'xpack.nightshift.workflowTriggers.investigationStarted.description',
    { defaultMessage: 'Emitted when an investigation starts.' }
  ),
  documentation: {
    details: i18n.translate(
      'xpack.nightshift.workflowTriggers.investigationStarted.documentation.details',
      {
        defaultMessage:
          'Emitted when an investigation begins for any subject (significant event, alert, manual). Filter with KQL on event.* (e.g. event.subject.type).',
      }
    ),
    examples: [
      i18n.translate(
        'xpack.nightshift.workflowTriggers.investigationStarted.documentation.example',
        {
          defaultMessage: notifyExample(
            'Investigation started for {{event.subject.type}} {{event.subject.id}}'
          ),
          values: { triggerId: INVESTIGATION_STARTED_TRIGGER_ID },
        }
      ),
    ],
  },
  snippets: { condition: 'event.subject.type: "significant_event"' },
};

export const investigationCompletedTriggerCommonDefinition: CommonTriggerDefinition = {
  id: INVESTIGATION_COMPLETED_TRIGGER_ID,
  stability: 'tech_preview',
  eventSchema: completedSchema,
  title: i18n.translate('xpack.nightshift.workflowTriggers.investigationCompleted.title', {
    defaultMessage: 'Nightshift investigations - Investigation completed',
  }),
  description: i18n.translate(
    'xpack.nightshift.workflowTriggers.investigationCompleted.description',
    { defaultMessage: 'Emitted when an investigation finishes successfully.' }
  ),
  documentation: {
    details: i18n.translate(
      'xpack.nightshift.workflowTriggers.investigationCompleted.documentation.details',
      {
        defaultMessage:
          'Emitted when an investigation finishes with status completed. Use event.investigation_id to fetch the full investigation result.',
      }
    ),
    examples: [
      i18n.translate(
        'xpack.nightshift.workflowTriggers.investigationCompleted.documentation.example',
        {
          defaultMessage: notifyExample('Investigation {{event.investigation_id}} completed'),
          values: { triggerId: INVESTIGATION_COMPLETED_TRIGGER_ID },
        }
      ),
    ],
  },
  snippets: { condition: 'event.status: "completed"' },
};

export const investigationFailedTriggerCommonDefinition: CommonTriggerDefinition = {
  id: INVESTIGATION_FAILED_TRIGGER_ID,
  stability: 'tech_preview',
  eventSchema: failedSchema,
  title: i18n.translate('xpack.nightshift.workflowTriggers.investigationFailed.title', {
    defaultMessage: 'Nightshift investigations - Investigation failed',
  }),
  description: i18n.translate('xpack.nightshift.workflowTriggers.investigationFailed.description', {
    defaultMessage: 'Emitted when an investigation fails.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.nightshift.workflowTriggers.investigationFailed.documentation.details',
      {
        defaultMessage:
          'Emitted when an investigation finishes with status failed. Use event.investigation_id to fetch error details.',
      }
    ),
    examples: [
      i18n.translate(
        'xpack.nightshift.workflowTriggers.investigationFailed.documentation.example',
        {
          defaultMessage: notifyExample('Investigation {{event.investigation_id}} failed'),
          values: { triggerId: INVESTIGATION_FAILED_TRIGGER_ID },
        }
      ),
    ],
  },
  snippets: { condition: 'event.status: "failed"' },
};

export const investigationsTriggerCommonDefinitions: CommonTriggerDefinition[] = [
  investigationStartedTriggerCommonDefinition,
  investigationCompletedTriggerCommonDefinition,
  investigationFailedTriggerCommonDefinition,
];
