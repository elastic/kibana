/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTING_V2_NOTIFICATION_GROUP_INPUT_DEFINITION_ID,
  KIBANA_WORKFLOW_INPUT_DEFINITION_REF_PREFIX,
} from '@kbn/workflows';
import { stringify } from 'yaml';

export const CONSOLE_LOG_WORKFLOW_NAME = 'Sample workflow: console log';

/**
 * YAML of the sample workflow the sample action policies dispatch to. It only logs the
 * dispatched notification group, so it needs no connector and can be replaced by the user.
 */
export const buildConsoleLogWorkflowYaml = (): string =>
  stringify(
    {
      name: CONSOLE_LOG_WORKFLOW_NAME,
      description:
        'Logs the notification group dispatched by an action policy. Replace it with a workflow that delivers to your own channel.',
      enabled: true,
      triggers: [
        {
          type: 'manual',
          inputs: {
            type: 'object',
            properties: {
              payload: {
                $ref: `${KIBANA_WORKFLOW_INPUT_DEFINITION_REF_PREFIX}${ALERTING_V2_NOTIFICATION_GROUP_INPUT_DEFINITION_ID}`,
              },
            },
            required: ['payload'],
          },
        },
      ],
      steps: [
        {
          name: 'log_notification_group',
          type: 'console',
          with: {
            message:
              'Action policy {{ inputs.payload.policyId }} dispatched {{ inputs.payload.episodes | size }} episode(s)',
          },
        },
      ],
    },
    { lineWidth: 0 }
  );
