/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
import { SIGNIFICANT_EVENT_STATUS_OPTIONS, SEVERITY_OPTIONS } from '@kbn/significant-events-schema';

/**
 * Custom workflow triggers owned by the significant_events plugin. Users subscribe to these in
 * their workflow YAML (e.g. `triggers: [{ type: significant-events.eventCreated }]`) to run a
 * workflow - for instance to post a Slack message - when a significant event or investigation
 * changes. The payloads are kept intentionally lean and filterable via KQL on `event.*`; consumers
 * that need richer data (full RCA, hypotheses, etc.) can fetch it via the event / workflow
 * execution APIs using `event_uuid` / `workflow_execution_id`.
 */

// Trigger ids: kebab-case namespace, camelCase event.
export const EVENT_CREATED_TRIGGER_ID = 'significant-events.eventCreated' as const;
export const EVENT_STATUS_CHANGED_TRIGGER_ID = 'significant-events.eventStatusChanged' as const;
export const INVESTIGATION_STARTED_TRIGGER_ID = 'significant-events.investigationStarted' as const;
export const INVESTIGATION_COMPLETED_TRIGGER_ID =
  'significant-events.investigationCompleted' as const;

const baseEventSchema = z.object({
  event_id: z
    .string()
    .describe('Stable incident key shared across every version of this significant event.'),
  event_uuid: z.string().describe('Unique ID of this specific (append-only) event version.'),
  title: z.string().describe('Human-readable incident label.'),
  summary: z.string().describe('Short human-readable description of what is happening.'),
  status: z
    .enum(SIGNIFICANT_EVENT_STATUS_OPTIONS)
    .describe('Current lifecycle status: "open", "closed", or "dismissed".'),
  severity: z
    .enum(SEVERITY_OPTIONS)
    .describe('Severity: "80-critical", "60-high", "40-medium", or "20-low".'),
  stream_names: z.array(z.string()).describe('Data streams associated with this event.'),
  occurred_at: z.string().describe('When this event version was written (ISO 8601 timestamp).'),
});

export type SignificantEventTriggerBasePayload = z.infer<typeof baseEventSchema>;

const eventStatusChangedSchema = baseEventSchema.extend({
  previous_status: z
    .enum(SIGNIFICANT_EVENT_STATUS_OPTIONS)
    .describe('The status the event had before this change.'),
});

export type EventStatusChangedTriggerPayload = z.infer<typeof eventStatusChangedSchema>;

// Investigation payloads carry the full base event fields (status, severity, stream_names, ...) so
// subscribers can KQL-filter investigation triggers the same way as event triggers (e.g. only
// investigations for `event.severity: "80-critical"`), plus the investigation-specific fields.
const investigationEventSchema = baseEventSchema.extend({
  workflow_execution_id: z
    .string()
    .describe('ID of the investigation workflow execution, used to fetch the full investigation.'),
  started_at: z.string().describe('When this investigation run started (ISO 8601 timestamp).'),
});

export type InvestigationStartedTriggerPayload = z.infer<typeof investigationEventSchema>;

const investigationCompletedSchema = investigationEventSchema.extend({
  completed_at: z.string().describe('When this investigation run finished (ISO 8601 timestamp).'),
});

export type InvestigationCompletedTriggerPayload = z.infer<typeof investigationCompletedSchema>;

/**
 * Maps each significant-events workflow trigger id to the exact payload shape emitted for it. Used
 * to type the server-side emitter end-to-end so a call site cannot pass the wrong payload for a
 * given trigger id.
 */
export interface SignificantEventsTriggerPayloadMap {
  [EVENT_CREATED_TRIGGER_ID]: SignificantEventTriggerBasePayload;
  [EVENT_STATUS_CHANGED_TRIGGER_ID]: EventStatusChangedTriggerPayload;
  [INVESTIGATION_STARTED_TRIGGER_ID]: InvestigationStartedTriggerPayload;
  [INVESTIGATION_COMPLETED_TRIGGER_ID]: InvestigationCompletedTriggerPayload;
}

/** Union of every significant-events workflow trigger id. */
export type SignificantEventsTriggerId = keyof SignificantEventsTriggerPayloadMap;

export const eventCreatedTriggerCommonDefinition: CommonTriggerDefinition = {
  id: EVENT_CREATED_TRIGGER_ID,
  stability: 'tech_preview',
  eventSchema: baseEventSchema,
  title: i18n.translate('xpack.significantEvents.workflowTriggers.eventCreated.title', {
    defaultMessage: 'Significant events - Event created',
  }),
  description: i18n.translate('xpack.significantEvents.workflowTriggers.eventCreated.description', {
    defaultMessage: 'Emitted when a new significant event is created.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.significantEvents.workflowTriggers.eventCreated.documentation.details',
      {
        defaultMessage:
          'Emitted when the first version of a significant event is created. Filter with KQL on event.* (e.g. event.severity, event.status, event.stream_names).',
      }
    ),
    examples: [
      i18n.translate(
        'xpack.significantEvents.workflowTriggers.eventCreated.documentation.example',
        {
          defaultMessage: `## Run only for critical events
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.severity: "80-critical"'
\`\`\``,
          values: { triggerId: EVENT_CREATED_TRIGGER_ID },
        }
      ),
    ],
  },
  snippets: { condition: 'event.severity: "80-critical"' },
};

export const eventStatusChangedTriggerCommonDefinition: CommonTriggerDefinition = {
  id: EVENT_STATUS_CHANGED_TRIGGER_ID,
  stability: 'tech_preview',
  eventSchema: eventStatusChangedSchema,
  title: i18n.translate('xpack.significantEvents.workflowTriggers.eventStatusChanged.title', {
    defaultMessage: 'Significant events - Event status changed',
  }),
  description: i18n.translate(
    'xpack.significantEvents.workflowTriggers.eventStatusChanged.description',
    {
      defaultMessage: 'Emitted when a significant event status changes.',
    }
  ),
  documentation: {
    details: i18n.translate(
      'xpack.significantEvents.workflowTriggers.eventStatusChanged.documentation.details',
      {
        defaultMessage:
          'Emitted when a significant event moves between statuses. The payload includes event.status and event.previous_status.',
      }
    ),
    examples: [
      i18n.translate(
        'xpack.significantEvents.workflowTriggers.eventStatusChanged.documentation.example',
        {
          defaultMessage: `## Run when an event is closed
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.status: "closed"'
\`\`\``,
          values: { triggerId: EVENT_STATUS_CHANGED_TRIGGER_ID },
        }
      ),
    ],
  },
  snippets: { condition: 'event.status: "closed"' },
};

export const investigationStartedTriggerCommonDefinition: CommonTriggerDefinition = {
  id: INVESTIGATION_STARTED_TRIGGER_ID,
  stability: 'tech_preview',
  eventSchema: investigationEventSchema,
  title: i18n.translate('xpack.significantEvents.workflowTriggers.investigationStarted.title', {
    defaultMessage: 'Significant events - Investigation started',
  }),
  description: i18n.translate(
    'xpack.significantEvents.workflowTriggers.investigationStarted.description',
    {
      defaultMessage: 'Emitted when an investigation starts for a significant event.',
    }
  ),
  documentation: {
    details: i18n.translate(
      'xpack.significantEvents.workflowTriggers.investigationStarted.documentation.details',
      {
        defaultMessage:
          'Emitted when an investigation run starts for a significant event. Use event.workflow_execution_id to correlate with the investigation workflow execution.',
      }
    ),
    examples: [
      i18n.translate(
        'xpack.significantEvents.workflowTriggers.investigationStarted.documentation.example',
        {
          defaultMessage: `## Run only for critical investigations
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.severity: "80-critical"'
\`\`\``,
          values: { triggerId: INVESTIGATION_STARTED_TRIGGER_ID },
        }
      ),
    ],
  },
  snippets: { condition: 'event.severity: "80-critical"' },
};

export const investigationCompletedTriggerCommonDefinition: CommonTriggerDefinition = {
  id: INVESTIGATION_COMPLETED_TRIGGER_ID,
  stability: 'tech_preview',
  eventSchema: investigationCompletedSchema,
  title: i18n.translate('xpack.significantEvents.workflowTriggers.investigationCompleted.title', {
    defaultMessage: 'Significant events - Investigation completed',
  }),
  description: i18n.translate(
    'xpack.significantEvents.workflowTriggers.investigationCompleted.description',
    {
      defaultMessage: 'Emitted when an investigation completes for a significant event.',
    }
  ),
  documentation: {
    details: i18n.translate(
      'xpack.significantEvents.workflowTriggers.investigationCompleted.documentation.details',
      {
        defaultMessage:
          'Emitted when an investigation run completes for a significant event. Use event.workflow_execution_id to fetch the full investigation result.',
      }
    ),
    examples: [
      i18n.translate(
        'xpack.significantEvents.workflowTriggers.investigationCompleted.documentation.example',
        {
          defaultMessage: `## Run only for critical investigations
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.severity: "80-critical"'
\`\`\``,
          values: { triggerId: INVESTIGATION_COMPLETED_TRIGGER_ID },
        }
      ),
    ],
  },
  snippets: { condition: 'event.severity: "80-critical"' },
};

export const significantEventsTriggerCommonDefinitions: CommonTriggerDefinition[] = [
  eventCreatedTriggerCommonDefinition,
  eventStatusChangedTriggerCommonDefinition,
  investigationStartedTriggerCommonDefinition,
  investigationCompletedTriggerCommonDefinition,
];
