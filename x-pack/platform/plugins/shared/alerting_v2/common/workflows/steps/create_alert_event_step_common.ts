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
  createAlertEventDataSchema,
  createAlertEventResponseSchema,
} from '@kbn/alerting-v2-schemas';

export const CREATE_ALERT_EVENT_STEP_ID = 'alerting.create_alert' as const;

export const createAlertEventStepCommonDefinition: CommonStepDefinition<
  typeof createAlertEventDataSchema,
  typeof createAlertEventResponseSchema
> = {
  id: CREATE_ALERT_EVENT_STEP_ID,
  label: i18n.translate('xpack.alertingV2.workflow.steps.createAlertEvent.label', {
    defaultMessage: 'Create Alert',
  }),
  description: i18n.translate('xpack.alertingV2.workflow.steps.createAlertEvent.description', {
    defaultMessage: 'Ingest an alert event into Elasticsearch without a backing Kibana rule.',
  }),
  category: StepCategory.Kibana,
  inputSchema: createAlertEventDataSchema,
  outputSchema: createAlertEventResponseSchema,
  documentation: {
    details: i18n.translate(
      'xpack.alertingV2.workflow.steps.createAlertEvent.documentation.details',
      {
        defaultMessage:
          'Writes an alert event to the alerting event stream. ' +
          'The event participates in the same lifecycle, UI, and action policies as ' +
          'Elastic-produced alerts.',
      }
    ),
    examples: [
      `## Ingest an alert with a fingerprint
\`\`\`yaml
- name: create_external_alert
  type: alerting.create_alert
  with:
    source: "my_external_service"
    fingerprint: "{{ inputs.payload.monitor_id }}"
    alert_status: "active"
    severity: "high"
    data:
      rule_name: "{{ inputs.payload.monitor_name }}"
      alert_url: "{{ inputs.payload.url }}"
\`\`\``,
    ],
  },
};
