/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { RulesClientContext } from '../../../../rules_client/types';
import type { GetGapFillAutoSchedulerLogsParams, GapFillAutoSchedulerLogsResult } from './types';
import { getGapFillAutoSchedulerLogsSchema } from './schemas';
import type { GapAutoFillSchedulerSavedObjectAttributes } from '../../transforms';
import { ReadOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import {
  gapAutoFillSchedulerAuditEvent,
  GapAutoFillSchedulerAuditAction,
} from '../../../../rules_client/common/audit_events';
import { GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE } from '../../../../saved_objects';

export async function getGapFillAutoSchedulerLogs(
  context: RulesClientContext,
  params: GetGapFillAutoSchedulerLogsParams
): Promise<GapFillAutoSchedulerLogsResult> {
  try {
    // Validate input parameters
    getGapFillAutoSchedulerLogsSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(
      `Error validating gap auto fill scheduler logs parameters "${JSON.stringify(params)}" - ${
        error.message
      }`
    );
  }

  try {
    // Get the scheduler saved object to access ruleTypes for authorization
    const schedulerSO =
      await context.unsecuredSavedObjectsClient.get<GapAutoFillSchedulerSavedObjectAttributes>(
        GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE,
        params.id
      );

    // Check for errors in the savedObjectClient result
    if (schedulerSO.error) {
      const err = new Error(schedulerSO.error.message);
      context.auditLogger?.log(
        gapAutoFillSchedulerAuditEvent({
          action: GapAutoFillSchedulerAuditAction.GET,
          savedObject: {
            type: GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE,
            id: params.id,
            name: schedulerSO.attributes.name,
          },
          error: new Error(schedulerSO.error.message),
        })
      );
      throw err;
    }

    // Authorization check - we need to check if user has permission to get logs
    // For gap fill auto scheduler, we check against the rule types it manages
    const ruleTypes = schedulerSO.attributes.ruleTypes || [];

    try {
      for (const ruleType of ruleTypes) {
        await context.authorization.ensureAuthorized({
          ruleTypeId: ruleType.type,
          consumer: ruleType.consumer,
          operation: ReadOperations.GetGapFillAutoSchedulerLogs,
          entity: AlertingAuthorizationEntity.Rule,
        });
      }
    } catch (error) {
      context.auditLogger?.log(
        gapAutoFillSchedulerAuditEvent({
          action: GapAutoFillSchedulerAuditAction.GET,
          savedObject: {
            type: GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE,
            id: params.id,
            name: schedulerSO.attributes.name,
          },
          error,
        })
      );
      throw error;
    }

    // Get the task ID from the scheduler saved object
    const taskId = schedulerSO.attributes.scheduledTaskId || params.id;

    // Build sort options
    const sortOptions = params.sort || [{ field: '@timestamp', direction: 'desc' }];
    const formattedSort = sortOptions.map((s) => ({
      sort_field: s.field,
      sort_order: s.direction,
    }));

    // Get event log client and query for gap-fill-auto-schedule events
    const eventLogClient = await context.getEventLogClient();

    const result = await eventLogClient.findEventsBySavedObjectIds('task', [taskId], {
      page: params.page || 1,
      per_page: params.perPage || 50,
      start: params.start,
      end: params.end,
      sort: formattedSort,
      filter: params.filter
        ? `(${params.filter}) AND event.action:gap-fill-auto-schedule`
        : 'event.action:gap-fill-auto-schedule',
    });

    // Log successful get logs
    context.auditLogger?.log(
      gapAutoFillSchedulerAuditEvent({
        action: GapAutoFillSchedulerAuditAction.GET,
        savedObject: {
          type: GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE,
          id: params.id,
          name: schedulerSO.attributes.name,
        },
      })
    );

    return {
      data: result.data,
      total: result.total,
      page: params.page || 1,
      perPage: params.perPage || 50,
    };
  } catch (err) {
    const errorMessage = `Failed to get gap fill auto scheduler logs by id: ${params.id}`;
    context.logger.error(`${errorMessage} - ${err}`);
    throw Boom.boomify(err, { message: errorMessage });
  }
}
