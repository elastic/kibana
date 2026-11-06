/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { i18n } from '@kbn/i18n';
import {
  createSignalEventDataSchema,
  createSignalEventResponseSchema,
} from '@kbn/alerting-v2-schemas';

export const CREATE_SIGNAL_EVENT_STEP_ID = 'alerting.create_signal' as const;

export const createSignalEventStepCommonDefinition: CommonStepDefinition<
  typeof createSignalEventDataSchema,
  typeof createSignalEventResponseSchema
> = {
  id: CREATE_SIGNAL_EVENT_STEP_ID,
  label: i18n.translate('xpack.alertingV2.workflow.steps.createSignalEvent.label', {
    defaultMessage: 'Create Signal',
  }),
  description: i18n.translate('xpack.alertingV2.workflow.steps.createSignalEvent.description', {
    defaultMessage: 'Record an observation-only signal event without a backing Kibana rule.',
  }),
  category: StepCategory.Kibana,
  inputSchema: createSignalEventDataSchema,
  outputSchema: createSignalEventResponseSchema,
  documentation: {
    details: i18n.translate(
      'xpack.alertingV2.workflow.steps.createSignalEvent.documentation.details',
      {
        defaultMessage:
          'Writes a signal event to the alerting event stream. ' +
          'A signal is an observation: it never becomes an alert, has no lifecycle, ' +
          'and is never sent to action policies. ' +
          'Without a fingerprint, all signals from one source share a single series.',
      }
    ),
    examples: [
      `## Record a signal
\`\`\`yaml
- name: create_external_signal
  type: alerting.create_signal
  with:
    source: "my_external_service"
    severity: "low"
    data:
      message: "{{ inputs.payload.message }}"
\`\`\``,
      `## Record a signal in a series per host
\`\`\`yaml
- name: create_host_signal
  type: alerting.create_signal
  with:
    source: "my_external_service"
    fingerprint_fields: ["host"]
    data:
      host: "{{ inputs.payload.host }}"
\`\`\``,
    ],
  },
};
