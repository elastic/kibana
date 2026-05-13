/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum AgentExecutionErrorCode {
  /** too many input tokens */
  contextLengthExceeded = 'context_length_exceeded',
  /** agent called a tool not currently available */
  toolNotFound = 'tool_not_found',
  /** agent called a tool with invalid arguments */
  toolValidationError = 'tool_validation_error',
  /** agent replied with an empty response */
  emptyResponse = 'empty_response',
  /** any uncategorized error */
  unknownError = 'unknown_error',
  /** invalid workflow state - should never be surfaced */
  invalidState = 'invalid_state',
  /** connector returned an HTTP error (4xx, 5xx) - status propagated to client */
  connectorError = 'connector_error',
}

export interface ToolNotFoundErrorMeta {
  /** name of the tool which was called */
  toolName: string;
  /** arguments the tool was called with */
  toolArgs: string | Record<string, any>;
}

export interface TooValidationErrorMeta {
  /** name of the tool which was called */
  toolName: string;
  /** arguments the tool was called with */
  toolArgs: string | Record<string, any>;
  /** schema validation error, if any */
  validationError?: string;
}

export interface ConnectorErrorMeta {
  statusCode: number;
}

interface ExecutionErrorMetaMap {
  [AgentExecutionErrorCode.toolNotFound]: ToolNotFoundErrorMeta;
  [AgentExecutionErrorCode.toolValidationError]: TooValidationErrorMeta;
  [AgentExecutionErrorCode.contextLengthExceeded]: {};
  [AgentExecutionErrorCode.unknownError]: {};
  [AgentExecutionErrorCode.invalidState]: {};
  [AgentExecutionErrorCode.emptyResponse]: {};
  [AgentExecutionErrorCode.connectorError]: ConnectorErrorMeta;
}

export type ExecutionErrorMetaOf<ErrCode extends AgentExecutionErrorCode> =
  ExecutionErrorMetaMap[ErrCode];
