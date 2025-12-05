/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { RulesClientContext } from '../../../../rules_client/types';
import type {
  FindGapAutoFillSchedulerLogsParams,
  GapAutoFillSchedulerLogsResult,
  GapAutoFillSchedulerLogEntry,
} from './types';
import { findGapAutoFillSchedulerLogsParamsSchema } from './schemas';
import type { GapAutoFillSchedulerSO } from '../../../../data/gap_auto_fill_scheduler/types/gap_auto_fill_scheduler';
import { ReadOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import {
  gapAutoFillSchedulerAuditEvent,
  GapAutoFillSchedulerAuditAction,
} from '../../../../rules_client/common/audit_events';
import { GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { formatGapAutoFillSchedulerLogEntry } from './utils';

export async function findGapAutoFillSchedulerLogs(
  context: RulesClientContext,
  params: FindGapAutoFillSchedulerLogsParams
): Promise<GapAutoFillSchedulerLogsResult> {
  try {
    // Validate input parameters
    findGapAutoFillSchedulerLogsParamsSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(
      `Error validating gap auto fill scheduler logs parameters "${JSON.stringify(params)}" - ${
        error.message
      }`
    );
  }

  try {
    // Get the scheduler saved object to access ruleTypes for authorization
    const schedulerSO = await context.unsecuredSavedObjectsClient.get<GapAutoFillSchedulerSO>(
      GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
      params.id
    );

    // Check for errors in the savedObjectClient result
    if (schedulerSO.error) {
      const err = new Error(schedulerSO.error.message);
      context.auditLogger?.log(
        gapAutoFillSchedulerAuditEvent({
          action: GapAutoFillSchedulerAuditAction.GET,
          savedObject: {
            type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
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
    const ruleTypes = schedulerSO.attributes.ruleTypes;

    try {
      for (const ruleType of ruleTypes) {
        await context.authorization.ensureAuthorized({
          ruleTypeId: ruleType.type,
          consumer: ruleType.consumer,
          operation: ReadOperations.FindGapAutoFillSchedulerLogs,
          entity: AlertingAuthorizationEntity.Rule,
        });
      }
    } catch (error) {
      context.auditLogger?.log(
        gapAutoFillSchedulerAuditEvent({
          action: GapAutoFillSchedulerAuditAction.GET_LOGS,
          savedObject: {
            type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
            id: params.id,
            name: schedulerSO.attributes.name,
          },
          error,
        })
      );
      throw error;
    }

    // Get the task ID from the scheduler saved object
    const taskId = schedulerSO.id;

    // Get event log client and query for gap-auto-fill-schedule events
    const eventLogClient = await context.getEventLogClient();

    const filters = ['event.action:gap-auto-fill-schedule'];
    if (params.statuses) {
      const statusFilters = `(${params.statuses
        .map((status) => `kibana.gap_auto_fill.execution.status : ${status}`)
        .join(' OR ')})`;
      filters.push(statusFilters);
    }

    const result = await eventLogClient.findEventsBySavedObjectIds('task', [taskId], {
      page: params.page,
      per_page: params.perPage,
      start: params.start,
      end: params.end,
      sort: [
        {
          sort_field: params.sortField,
          sort_order: params.sortDirection,
        },
      ],
      filter: filters.join(' AND '),
    });

    // Log successful get logs
    context.auditLogger?.log(
      gapAutoFillSchedulerAuditEvent({
        action: GapAutoFillSchedulerAuditAction.GET_LOGS,
        savedObject: {
          type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
          id: params.id,
          name: schedulerSO.attributes.name,
        },
      })
    );

    // Transform raw event log data into cleaner format
    const transformedData: GapAutoFillSchedulerLogEntry[] = result.data.map(
      formatGapAutoFillSchedulerLogEntry
    );

    return {
      data: transformedData,
      total: result.total,
      page: result.page,
      perPage: result.per_page,
    };
  } catch (err) {
    const errorMessage = `Failed to get gap fill auto scheduler logs by id: ${params.id}`;
    context.logger.error(`${errorMessage} - ${err}`);
    throw Boom.boomify(err, { message: errorMessage });
  }
}
