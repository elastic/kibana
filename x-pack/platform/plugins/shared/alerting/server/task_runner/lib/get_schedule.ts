/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { Interval } from '@kbn/task-manager-plugin/server/lib/intervals';
import { throwUnrecoverableError } from '@kbn/task-manager-plugin/server';
import { resolveErr, type Result } from '../../lib/result_type';
import type { IntervalSchedule } from '../../types';
import { isAlertSavedObjectNotFoundError, isEsUnavailableError } from '../../lib/is_alerting_error';
import { parseDuration } from '../../../common';
import { isClusterBlockError } from '../../lib/error_with_type';

const CONNECTIVITY_RETRY_INTERVAL = '5m';
const CLUSTER_BLOCKED_EXCEPTION_RETRY_INTERVAL = '1m';

export function getSchedule({
  schedule,
  ruleId,
  spaceId,
  retryInterval,
  logger,
}: {
  schedule: Result<IntervalSchedule, Error>;
  ruleId: string;
  spaceId: string;
  retryInterval: Interval;
  logger: Logger;
}) {
  return resolveErr<IntervalSchedule | undefined, Error>(schedule, (error) => {
    if (isAlertSavedObjectNotFoundError(error, ruleId)) {
      const spaceMessage = spaceId ? `in the "${spaceId}" space ` : '';
      logger.warn(
        `Unable to execute rule "${ruleId}" ${spaceMessage}because ${error.message} - this rule will not be rescheduled. To restart rule execution, try disabling and re-enabling this rule.`
      );
      throwUnrecoverableError(error);
    }

    // Set retry interval smaller for ES connectivity errors
    if (isEsUnavailableError(error, ruleId)) {
      retryInterval =
        parseDuration(retryInterval) > parseDuration(CONNECTIVITY_RETRY_INTERVAL)
          ? CONNECTIVITY_RETRY_INTERVAL
          : retryInterval;
    }

    if (isClusterBlockError(error)) {
      retryInterval = CLUSTER_BLOCKED_EXCEPTION_RETRY_INTERVAL;
    }

    return { interval: retryInterval };
  });
}
