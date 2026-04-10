/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CONNECTOR_OR_INFERENCE_ID_CONFLICT_MESSAGE_REST =
  'Cannot specify both connector_id and inference_id.';

export const CONNECTOR_OR_INFERENCE_ID_CONFLICT_MESSAGE_WORKFLOW =
  'Cannot specify both connector-id and inference-id.';

export class ConnectorOrInferenceIdConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConnectorOrInferenceIdConflictError';
  }
}

export const normalizeOptionalConnectorOrInferenceParam = (value: unknown): string | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

export interface ResolveConnectorOrInferenceIdParams {
  connectorId?: unknown;
  inferenceId?: unknown;
}

export const resolveConnectorOrInferenceId = (
  params: ResolveConnectorOrInferenceIdParams,
  conflictMessage: string = CONNECTOR_OR_INFERENCE_ID_CONFLICT_MESSAGE_REST
): string | undefined => {
  const connector = normalizeOptionalConnectorOrInferenceParam(params.connectorId);
  const inference = normalizeOptionalConnectorOrInferenceParam(params.inferenceId);
  if (connector !== undefined && inference !== undefined) {
    throw new ConnectorOrInferenceIdConflictError(conflictMessage);
  }
  return connector ?? inference;
};
