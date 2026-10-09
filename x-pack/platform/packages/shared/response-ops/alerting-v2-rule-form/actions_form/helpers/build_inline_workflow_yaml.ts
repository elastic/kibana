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
import { stringifyWorkflowDefinition } from '@kbn/workflows-yaml';
import { INLINE_WORKFLOW_TAG } from '../constants';
import { getInlineActionStepDefinition } from '../registry';
import type { InlineWorkflowActionDraft } from '../types';
import { parseInlineParams } from './parse_inline_params';

export class InvalidInlineWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidInlineWorkflowError';
  }
}

export const stepTypeFromConnectorType = (connectorTypeId: string, subAction?: string): string => {
  const typeId = connectorTypeId.startsWith('.') ? connectorTypeId.slice(1) : connectorTypeId;
  return subAction ? `${typeId}.${subAction}` : typeId;
};

export const buildInlineWorkflowYaml = (action: InlineWorkflowActionDraft): string => {
  const definition = getInlineActionStepDefinition(action.stepType);
  if (!definition) {
    throw new InvalidInlineWorkflowError(`Unknown inline action step type: ${action.stepType}`);
  }
  if (!action.connectorId) {
    throw new InvalidInlineWorkflowError('A connector must be selected.');
  }
  const parsed = parseInlineParams(action.params);
  if ('error' in parsed) {
    throw new InvalidInlineWorkflowError(parsed.error.message);
  }

  const workflow = {
    name: `${definition.label} notification`,
    enabled: true,
    tags: [INLINE_WORKFLOW_TAG],
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
        name: 'notify',
        type: stepTypeFromConnectorType(
          definition.connectorTypeId,
          definition.connectorTypeSubAction
        ),
        'connector-id': action.connectorId,
        with: parsed.params,
      },
    ],
  };

  return stringifyWorkflowDefinition(workflow);
};
