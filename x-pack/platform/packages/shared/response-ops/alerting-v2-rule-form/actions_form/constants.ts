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

/**
 * Trigger inputs declared by every inline action policy workflow. The dispatcher schedules the
 * workflow with `{ payload }`, so templates reference `{{ inputs.payload.* }}`.
 */
export const INLINE_WORKFLOW_INPUTS: JsonSchema = {
  type: 'object',
  properties: {
    payload: {
      $ref: `${KIBANA_WORKFLOW_INPUT_DEFINITION_REF_PREFIX}${ALERTING_V2_NOTIFICATION_GROUP_INPUT_DEFINITION_ID}`,
    },
  },
  required: ['payload'],
};
