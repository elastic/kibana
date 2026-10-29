/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { AlertingV2LogCode } from '../../../lib/errors/error_codes';
import type { LoggerServiceContract } from '../../../lib/services/logger_service/logger_service';
import { RuleOperationValidationError } from '../rule_operations/operations';

export const ruleToolResult = (data: Record<string, unknown>) => ({
  results: [{ type: ToolResultType.other, tool_result_id: getToolResultId(), data }],
});

interface RuleToolErrorOptions {
  readonly error: unknown;
  readonly logger: LoggerServiceContract;
  readonly toolName: string;
  readonly code: AlertingV2LogCode;
  readonly spaceId: string;
  readonly ruleId?: string;
  readonly metadata: Record<string, unknown>;
}

/**
 * Logs input validation failures at debug and anything unexpected at warn, then returns
 * the error to the agent so it can correct the call.
 */
export const ruleToolErrorResult = ({
  error,
  logger,
  toolName,
  code,
  spaceId,
  ruleId,
  metadata,
}: RuleToolErrorOptions) => {
  const labels = { space_id: spaceId, ...(ruleId != null ? { rule_id: ruleId } : {}) };
  if (error instanceof RuleOperationValidationError) {
    logger.debug({ message: `Invalid ${toolName} input`, labels });
  } else {
    logger.warn({ message: `${toolName} failed`, code, labels, error });
  }

  const message = error instanceof Error ? error.message : String(error);
  return {
    results: [
      { type: ToolResultType.error, data: { message: `${toolName} failed: ${message}`, metadata } },
    ],
  };
};
