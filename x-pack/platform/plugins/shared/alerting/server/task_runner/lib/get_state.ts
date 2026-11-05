/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { isUnauthorizedError } from '@kbn/es-errors';
import { TaskErrorSource, isUserError } from '@kbn/task-manager-plugin/server/task_running';
import type { RuleRunnerErrorStackTraceLog, RunRuleResult } from '../types';
import type { ElasticsearchError } from '../../lib';
import type { RuleTaskState } from '../../types';
import type { Result } from '../../lib/result_type';
import { map } from '../../lib/result_type';
import { isAlertSavedObjectNotFoundError } from '../../lib/is_alerting_error';
import { isClusterBlockError } from '../../lib/error_with_type';
import { isErrorWithReason } from '../../lib/error_with_reason';
import { getEsErrorMessage } from '../../lib/errors';

export function getState({
  runRuleResult,
  startedAt,
  ruleId,
  spaceId,
  ruleTypeId,
  logger,
  stackTraceLog,
  originalState,
  apiKeyCreatedByUser = false,
}: {
  runRuleResult: Result<RunRuleResult, Error>;
  startedAt: Date | null;
  ruleId: string;
  spaceId: string;
  ruleTypeId: string;
  logger: Logger;
  stackTraceLog: RuleRunnerErrorStackTraceLog | null;
  originalState: RuleTaskState;
  apiKeyCreatedByUser?: boolean;
}) {
  return map<RunRuleResult, ElasticsearchError, RuleTaskState>(
    runRuleResult,
    ({ state }: RunRuleResult) => ({ ...state, previousStartedAt: startedAt?.toISOString() }),
    (err: ElasticsearchError) => {
      const errorSource = isUserError(err) ? TaskErrorSource.USER : TaskErrorSource.FRAMEWORK;
      // The executor error arrives wrapped in an ErrorWithReason; unwrap it so a 401 from
      // Elasticsearch gets a stable tag that log-based alerts can match regardless of source.
      // `user-key` marks an auth failure on a key the user supplied rather than one Kibana
      // created, so alerts can tell the two apart without hiding either.
      const isAuthError = isUnauthorizedError(isErrorWithReason(err) ? err.error : err);
      const tags = [
        'rule-run-failed',
        `${errorSource}-error`,
        ...(isAuthError ? ['auth-error'] : []),
        ...(isAuthError && apiKeyCreatedByUser ? ['user-key'] : []),
      ];

      if (isAlertSavedObjectNotFoundError(err, ruleId) || isClusterBlockError(err)) {
        const message = `Executing Rule ${spaceId}:${ruleTypeId}:${ruleId} has resulted in Error: ${getEsErrorMessage(
          err
        )}`;
        logger.debug(message, {
          tags,
        });
      } else {
        const error = stackTraceLog ? stackTraceLog.message : err;
        const stack = stackTraceLog ? stackTraceLog.stackTrace : err.stack;
        const message = `Executing Rule ${spaceId}:${ruleTypeId}:${ruleId} has resulted in Error: ${getEsErrorMessage(
          error
        )} - ${stack ?? ''}`;
        logger.error(message, {
          tags,
          error: { stack_trace: stack },
        });
      }
      return originalState;
    }
  );
}
