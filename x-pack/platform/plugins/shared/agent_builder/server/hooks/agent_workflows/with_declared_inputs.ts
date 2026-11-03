/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import { getInputsFromDefinition } from '@kbn/workflows/spec/lib/field_conversion';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';

type WorkflowApi = WorkflowsServerPluginSetup['management'];

/**
 * Returns `inputs` plus the entries of `optionalInputs` that the workflow declares as inputs.
 * Hook inputs added after a workflow was written must not reach it: workflows with
 * `additionalProperties: false` fail input validation on any undeclared input.
 */
export const withDeclaredInputs = async ({
  workflowId,
  inputs,
  optionalInputs,
  workflowApi,
  spaceId,
  request,
  logger,
}: {
  workflowId: string;
  inputs: Record<string, unknown>;
  optionalInputs: Record<string, unknown>;
  workflowApi: WorkflowApi;
  spaceId: string;
  request: KibanaRequest;
  logger: Logger;
}): Promise<Record<string, unknown>> => {
  const candidates = Object.entries(optionalInputs).filter(([, value]) => value !== undefined);
  if (candidates.length === 0) {
    return inputs;
  }

  let declared: Record<string, unknown> | undefined;
  try {
    const workflow = await workflowApi.getWorkflow(workflowId, spaceId, request);
    declared = getInputsFromDefinition(workflow?.definition)?.properties;
  } catch (error) {
    logger.warn(`Could not read the inputs of workflow "${workflowId}": ${error}`);
  }
  if (!declared) {
    return inputs;
  }

  const declaredInputs = declared;
  return {
    ...inputs,
    ...Object.fromEntries(
      candidates.filter(([name]) => Object.prototype.hasOwnProperty.call(declaredInputs, name))
    ),
  };
};
