/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { TaskErrorSource, isUserError } from '@kbn/task-manager-plugin/server/task_running';
import type { RuleRunnerErrorStackTraceLog, RunRuleResult } from '../types';
import type { ElasticsearchError } from '../../lib';
import type { RuleTaskState } from '../../types';
import type { Result } from '../../lib/result_type';
import { map } from '../../lib/result_type';
import { isAlertSavedObjectNotFoundError } from '../../lib/is_alerting_error';
import { isClusterBlockError } from '../../lib/error_with_type';
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
}: {
  runRuleResult: Result<RunRuleResult, Error>;
  startedAt: Date | null;
  ruleId: string;
  spaceId: string;
  ruleTypeId: string;
  logger: Logger;
  stackTraceLog: RuleRunnerErrorStackTraceLog | null;
  originalState: RuleTaskState;
}) {
  return map<RunRuleResult, ElasticsearchError, RuleTaskState>(
    runRuleResult,
    ({ state }: RunRuleResult) => ({ ...state, previousStartedAt: startedAt?.toISOString() }),
    (err: ElasticsearchError) => {
      const errorSource = isUserError(err) ? TaskErrorSource.USER : TaskErrorSource.FRAMEWORK;
      const errorSourceTag = `${errorSource}-error`;

      if (isAlertSavedObjectNotFoundError(err, ruleId) || isClusterBlockError(err)) {
        const message = `Executing Rule ${spaceId}:${ruleTypeId}:${ruleId} has resulted in Error: ${getEsErrorMessage(
          err
        )}`;
        logger.debug(message, {
          tags: [ruleTypeId, ruleId, 'rule-run-failed', errorSourceTag],
        });
      } else {
        const error = stackTraceLog ? stackTraceLog.message : err;
        const stack = stackTraceLog ? stackTraceLog.stackTrace : err.stack;
        const message = `Executing Rule ${spaceId}:${ruleTypeId}:${ruleId} has resulted in Error: ${getEsErrorMessage(
          error
        )} - ${stack ?? ''}`;
        logger.error(message, {
          tags: [ruleTypeId, ruleId, 'rule-run-failed', errorSourceTag],
          error: { stack_trace: stack },
        });
      }
      return originalState;
    }
  );
}
