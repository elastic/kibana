/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { v4 as uuidv4 } from 'uuid';
import type { RulesSettingsAlertDeleteProperties } from '@kbn/alerting-types';
import type { KibanaRequest } from '@kbn/core/server';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { type AlertDeletionContext, ALERT_DELETION_TASK_TYPE } from '../alert_deletion_client';
import { AlertAuditAction, alertAuditEvent } from '../../lib';

export const scheduleTask = async (
  context: AlertDeletionContext,
  request: KibanaRequest,
  settings: RulesSettingsAlertDeleteProperties,
  spaceIds: string[]
) => {
  try {
    const taskManager = await context.taskManagerStartPromise;
    const securityService = await context.securityService;

    // check that there are no existing alert deletion tasks for the same spaceIds
    const result = await taskManager.fetch({
      query: {
        bool: {
          filter: [
            { term: { 'task.taskType': ALERT_DELETION_TASK_TYPE } },
            { term: { 'task.status': TaskStatus.Running } },
          ],
        },
      },
    });

    let shouldScheduleTask = false;

    if (result.docs.length > 0) {
      // get all the space IDs from currently running tasks
      const runningSpaceIds = new Set<string>();
      for (const task of result.docs) {
        (task.params.spaceIds ?? []).forEach((spaceId: string) => runningSpaceIds.add(spaceId));
      }
      context.logger.debug(
        `Found alert deletion tasks running for space IDs: ${[...runningSpaceIds].join(', ')}`
      );

      // check if any of the requested space IDs are already running
      const alreadyRunning = [...runningSpaceIds].filter((spaceId) => spaceIds.includes(spaceId));
      if (alreadyRunning.length > 0) {
        return i18n.translate('xpack.alerting.alertDeletion.scheduleTask.alreadyRunningError', {
          defaultMessage: 'Alert deletion task is already running for this space.',
        });
      } else {
        shouldScheduleTask = true;
      }
    } else {
      shouldScheduleTask = true;
    }

    if (shouldScheduleTask) {
      await taskManager.schedule({
        id: `Alerting-${ALERT_DELETION_TASK_TYPE}-${uuidv4()}`,
        taskType: ALERT_DELETION_TASK_TYPE,
        scope: ['alerting'],
        state: {},
        params: { settings, spaceIds },
      });

      const user = securityService.authc.getCurrentUser(request);
      context.auditService?.asScoped(request)?.log(
        alertAuditEvent({
          action: AlertAuditAction.SCHEDULE_DELETE,
          outcome: 'success',
          actor: user?.username,
          bulk: true,
        })
      );
    }
  } catch (err) {
    context.logger.error(`Error scheduling alert deletion task: ${err.message}`);
    context.auditService?.asScoped(request)?.log(
      alertAuditEvent({
        action: AlertAuditAction.SCHEDULE_DELETE,
        outcome: 'failure',
        bulk: true,
        error: err,
      })
    );
    throw err;
  }
};
