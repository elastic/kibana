/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTING_V2_NOTIFICATION_GROUP_INPUT_DEFINITION_ID,
  KIBANA_WORKFLOW_INPUT_DEFINITION_REF_PREFIX,
  type JsonSchema,
} from '@kbn/workflows';

export const INLINE_WORKFLOW_TAG = 'alertingv2-action-policy';

export const INPUTS = 'inputs';
// The dispatcher schedules inline workflows with `{ payload }`.
export const PAYLOAD_INPUT = 'payload';

/**
 * Trigger inputs declared by every inline action policy workflow, so templates reference
 * `{{ inputs.payload.* }}`.
 */
export const INLINE_WORKFLOW_INPUTS: JsonSchema = {
  type: 'object',
  properties: {
    [PAYLOAD_INPUT]: {
      $ref: `${KIBANA_WORKFLOW_INPUT_DEFINITION_REF_PREFIX}${ALERTING_V2_NOTIFICATION_GROUP_INPUT_DEFINITION_ID}`,
    },
  },
  required: [PAYLOAD_INPUT],
};

// Liquid paths shared by the default params templates and the Add variable list: templates loop
// over the payload alerts and look up each alert's rule by its id.
export const PAYLOAD_PATH = `${INPUTS}.${PAYLOAD_INPUT}`;
export const ALERTS_FIELD = 'alerts';
export const RULES_FIELD = 'rules';
export const ALERT_LOOP_VARIABLE = 'alert';
export const ALERTS_LOOP = `{% for ${ALERT_LOOP_VARIABLE} in ${PAYLOAD_PATH}.${ALERTS_FIELD} %}`;
export const ALERT_RULE_ID = `${ALERT_LOOP_VARIABLE}.rule_id`;
export const ALERT_RULE_PATH = `${PAYLOAD_PATH}.${RULES_FIELD}[${ALERT_RULE_ID}]`;
