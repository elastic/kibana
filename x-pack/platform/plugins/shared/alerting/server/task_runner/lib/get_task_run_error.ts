/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import {
  TaskErrorSource,
  createTaskRunError,
  getErrorSource,
} from '@kbn/task-manager-plugin/server/task_running';
import { isErr, type Result } from '../../lib/result_type';
import type { RunRuleResult } from '../types';
import type { RuleResultService } from '../../monitoring/rule_result_service';

export function getTaskRunError({
  runRuleResult,
  logger,
  ruleResult,
  ruleTypeId,
  ruleId,
}: {
  runRuleResult: Result<RunRuleResult, Error>;
  logger: Logger;
  ruleResult: RuleResultService;
  ruleTypeId: string;
  ruleId: string;
}) {
  if (isErr(runRuleResult)) {
    return {
      taskRunError: createTaskRunError(runRuleResult.error, getErrorSource(runRuleResult.error)),
    };
  }

  const { errors: errorsFromLastRun } = ruleResult.getLastRunResults();
  if (errorsFromLastRun.length > 0) {
    const isLastRunUserError = !errorsFromLastRun.some((lastRunError) => !lastRunError.userError);
    const errorSource = isLastRunUserError ? TaskErrorSource.USER : TaskErrorSource.FRAMEWORK;
    const lasRunErrorMessages = errorsFromLastRun
      .map((lastRunError) => lastRunError.message)
      .join(',');
    const errorMessage = `Executing Rule ${ruleTypeId}:${ruleId} has resulted in the following error(s): ${lasRunErrorMessages}`;
    logger.error(errorMessage, {
      tags: [ruleTypeId, ruleId, 'rule-run-failed', `${errorSource}-error`],
    });
    return {
      taskRunError: createTaskRunError(new Error(errorMessage), errorSource),
    };
  }

  return {};
}
