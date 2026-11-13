/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringifyWorkflowDefinition } from '@kbn/workflows-yaml';
import { CREATE_ALERT_EVENT_STEP_ID } from '../../../common/workflows/steps/create_alert_event_step_common';

export const IMPORT_WORKFLOW_TAG = 'custom-import';
const INBOUND_WEBHOOK_RECEIVED_TRIGGER = 'inboundWebhook.received';

export interface ImportWorkflowParams {
  name: string;
  connectorId: string;
  source: string;
  severity: string;
  /** Dotted path into the webhook body that identifies one alert series. */
  fingerprintField?: string;
}

/**
 * Workflow that turns each payload received by the connector into an alert. Without a fingerprint
 * field, every payload gets its own series through the per-request correlation key.
 */
export const buildImportWorkflowYaml = ({
  name,
  connectorId,
  source,
  severity,
  fingerprintField,
}: ImportWorkflowParams): string => {
  const seriesKey = fingerprintField
    ? `{{ event.body.${fingerprintField} }}`
    : '{{ event.correlationKey }}';

  return stringifyWorkflowDefinition({
    name: `Import: ${name}`,
    description: 'Creates alerts from the payloads received by an alert import.',
    enabled: true,
    tags: [IMPORT_WORKFLOW_TAG],
    triggers: [{ type: INBOUND_WEBHOOK_RECEIVED_TRIGGER, 'connector-id': connectorId }],
    steps: [
      {
        name: 'create_alert',
        type: CREATE_ALERT_EVENT_STEP_ID,
        with: {
          source,
          connector_id: '{{ event.connectorId }}',
          fingerprint: `{{ event.connectorId }}:${seriesKey}`,
          severity,
          data: '${{ event.body }}',
        },
      },
    ],
  });
};
