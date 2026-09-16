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
import { parse } from 'yaml';
import { INLINE_WORKFLOW_TAG } from '../constants';
import { getInlineActionStepDefinition } from '../registry';
import type { InlineWorkflowActionDraft, InlineWorkflowStepDraft } from '../types';

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

const parseParams = (params: string): Record<string, unknown> => {
  let parsed: unknown;
  try {
    parsed = parse(params);
  } catch (err) {
    throw new InvalidInlineWorkflowError(
      `Workflow params YAML is invalid: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (parsed === null || parsed === undefined) {
    return {};
  }

  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new InvalidInlineWorkflowError(
      'Workflow params YAML must define an object at the top level.'
    );
  }

  return parsed as Record<string, unknown>;
};

const buildWorkflowStep = (step: InlineWorkflowStepDraft) => {
  const definition = getInlineActionStepDefinition(step.stepType);
  if (!definition) {
    throw new InvalidInlineWorkflowError(`Unknown inline action step type: ${step.stepType}`);
  }
  if (!step.connectorId) {
    throw new InvalidInlineWorkflowError('A connector must be selected for every step.');
  }

  return {
    name: step.stepName.trim() || 'notify',
    type: stepTypeFromConnectorType(definition.connectorTypeId, definition.connectorTypeSubAction),
    'connector-id': step.connectorId,
    with: parseParams(step.params),
  };
};

export const buildInlineWorkflowYaml = (action: InlineWorkflowActionDraft): string => {
  if (action.steps.length === 0) {
    throw new InvalidInlineWorkflowError('At least one workflow step is required.');
  }

  const firstDefinition = getInlineActionStepDefinition(action.steps[0].stepType);
  const workflow = {
    name:
      action.workflowName.trim() ||
      (firstDefinition ? `${firstDefinition.label} notification` : 'Notification'),
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
    steps: action.steps.map(buildWorkflowStep),
  };

  return stringifyWorkflowDefinition(workflow);
};
