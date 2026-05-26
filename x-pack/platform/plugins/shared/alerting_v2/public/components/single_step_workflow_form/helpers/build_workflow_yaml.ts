/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringifyWorkflowDefinition } from '@kbn/workflows-yaml';
import { parse } from 'yaml';
import { SINGLE_STEP_WORKFLOW_TAG } from '../constants';
import { getSingleStepWorkflowType } from '../registry';
import type { CreateWorkflowFormValue } from '../types';

export class InvalidSingleStepWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidSingleStepWorkflowError';
  }
}

const stepTypeFromConnectorType = (connectorTypeId: string): string =>
  connectorTypeId.startsWith('.') ? connectorTypeId.slice(1) : connectorTypeId;

const parseParams = (params: string): Record<string, unknown> => {
  let parsed: unknown;
  try {
    parsed = parse(params);
  } catch (err) {
    throw new InvalidSingleStepWorkflowError(
      `Workflow params YAML is invalid: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (parsed === null || parsed === undefined) {
    return {};
  }

  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new InvalidSingleStepWorkflowError(
      'Workflow params YAML must define an object at the top level.'
    );
  }

  return parsed as Record<string, unknown>;
};

export const buildSingleStepWorkflowYaml = (value: CreateWorkflowFormValue): string => {
  const type = getSingleStepWorkflowType(value.typeId);
  if (!type) {
    throw new InvalidSingleStepWorkflowError(`Unknown single-step workflow type: ${value.typeId}`);
  }
  if (!value.connectorId) {
    throw new InvalidSingleStepWorkflowError('A connector must be selected.');
  }

  const workflow = {
    name: value.name?.trim() || `${type.label} notification`,
    enabled: true,
    tags: [SINGLE_STEP_WORKFLOW_TAG],
    triggers: [{ type: 'manual' }],
    steps: [
      {
        name: 'notify',
        type: stepTypeFromConnectorType(type.connectorTypeId),
        'connector-id': value.connectorId,
        with: parseParams(value.params),
      },
    ],
  };

  return stringifyWorkflowDefinition(workflow);
};
