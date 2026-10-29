/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify } from 'yaml';
import { CREATE_ALERT_EVENT_STEP_ID } from '../../../common/workflows/steps/create_alert_event_step_common';

/** Tag every generated workflow carries, so imports can be told apart from other workflows. */
export const CUSTOM_IMPORT_WORKFLOW_TAG = 'custom-import';

const INBOUND_WEBHOOK_RECEIVED_TRIGGER = 'inboundWebhook.received';

export interface CustomImportWorkflowParams {
  name: string;
  importId: string;
  connectorId: string;
  source: string;
  /** Dotted path into the webhook body that identifies one alert series. */
  fingerprintField?: string;
  severity?: string;
}

/**
 * Builds the workflow that turns a webhook payload into an alert: the payload is passed through as
 * the alert data, and the series is keyed by the import id plus one payload field, so two imports
 * that share a source never merge. Without a field every payload is its own series.
 *
 * `${{ ... }}` keeps the type of the value, which is how the payload reaches `data` as an object.
 */
export const buildCustomImportWorkflowYaml = ({
  name,
  importId,
  connectorId,
  source,
  fingerprintField,
  severity,
}: CustomImportWorkflowParams): string => {
  const seriesKey = fingerprintField
    ? `{{ event.body.${fingerprintField} }}`
    : '{{ event.correlationKey }}';

  return stringify({
    name: `Import: ${name}`,
    description:
      'Creates alerts from payloads received by a custom import. Generated, edit with care.',
    enabled: true,
    tags: [CUSTOM_IMPORT_WORKFLOW_TAG],
    consts: { import_id: importId },
    triggers: [{ type: INBOUND_WEBHOOK_RECEIVED_TRIGGER, 'connector-id': connectorId }],
    steps: [
      {
        name: 'create_alert',
        type: CREATE_ALERT_EVENT_STEP_ID,
        with: {
          source,
          // Not a rule: the import config id, so imported alerts can be traced back to the import.
          rule_id: '{{ consts.import_id }}',
          fingerprint: `{{ consts.import_id }}:${seriesKey}`,
          ...(severity ? { severity } : {}),
          data: '${{ event.body }}',
        },
      },
    ],
  });
};
