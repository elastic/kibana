/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isToolNotFoundError,
  isToolValidationError,
  isContextLengthExceededError,
} from '@kbn/inference-common/src/chat_complete/errors';
import type { AgentBuilderAgentExecutionError } from '@kbn/agent-builder-common/base/errors';
import { AgentExecutionErrorCode as ErrCodes } from '@kbn/agent-builder-common/agents';
import {
  createAgentExecutionError,
  isAgentExecutionError,
} from '@kbn/agent-builder-common/base/errors';

const recoverableErrorCodes = [
  ErrCodes.toolNotFound,
  ErrCodes.toolValidationError,
  ErrCodes.emptyResponse,
];

/**
 * Converts an error which occurred during the execution of the agent to our error format,
 * leveraging the errors which are already processed by the inference plugin for some of them.
 * Also categorizes the error to identifiable error codes.
 */
export const convertError = (error: Error): AgentBuilderAgentExecutionError => {
  if (isToolNotFoundError(error)) {
    return createAgentExecutionError(error.message, ErrCodes.toolNotFound, {
      toolName: error.meta.name,
      toolArgs: error.meta.arguments,
    });
  } else if (isToolValidationError(error)) {
    return createAgentExecutionError(error.message, ErrCodes.toolValidationError, {
      toolName: error.meta.name ?? 'unknown',
      toolArgs: error.meta.arguments ?? '',
      validationError: error.meta.errorsText,
    });
  } else if (isContextLengthExceededError(error)) {
    return createAgentExecutionError(error.message, ErrCodes.contextLengthExceeded, {});
  } else {
    return createAgentExecutionError(error.message, ErrCodes.unknownError, {});
  }
};

export const isRecoverableError = (error: AgentBuilderAgentExecutionError): boolean => {
  if (!isAgentExecutionError(error)) {
    return false;
  }
  return recoverableErrorCodes.includes(error.meta.errCode);
};
