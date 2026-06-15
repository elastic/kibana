/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringifyWorkflowDefinition } from '@kbn/workflows-yaml';
import { parse } from 'yaml';
import { INLINE_WORKFLOW_TAG } from '../constants';
import { getInlineActionStepDefinition } from '../registry';
import type { InlineWorkflowActionDraft } from '../types';

export class InvalidInlineWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidInlineWorkflowError';
  }
}

const stepTypeFromConnectorType = (connectorTypeId: string): string =>
  connectorTypeId.startsWith('.') ? connectorTypeId.slice(1) : connectorTypeId;

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

export const buildInlineWorkflowYaml = (action: InlineWorkflowActionDraft): string => {
  const definition = getInlineActionStepDefinition(action.stepType);
  if (!definition) {
    throw new InvalidInlineWorkflowError(`Unknown inline action step type: ${action.stepType}`);
  }
  if (!action.connectorId) {
    throw new InvalidInlineWorkflowError('A connector must be selected.');
  }

  const workflow = {
    name: `${definition.label} notification`,
    enabled: true,
    tags: [INLINE_WORKFLOW_TAG],
    triggers: [{ type: 'manual' }],
    steps: [
      {
        name: 'notify',
        type: stepTypeFromConnectorType(definition.connectorTypeId),
        'connector-id': action.connectorId,
        with: parseParams(action.params),
      },
    ],
  };

  return stringifyWorkflowDefinition(workflow);
};
