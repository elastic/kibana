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
import { ReadOperations } from '../../../../authorization';
import {
  gapAutoFillSchedulerAuditEvent,
  GapAutoFillSchedulerAuditAction,
} from '../../../../rules_client/common/audit_events';
import { GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { formatGapAutoFillSchedulerLogEntry } from './utils';
import { getGapAutoFillSchedulerSO } from '../utils';

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
    // Get the scheduler saved object and perform authorization against the rule types it manages
    const schedulerSO = await getGapAutoFillSchedulerSO({
      context,
      id: params.id,
      operation: ReadOperations.FindGapAutoFillSchedulerLogs,
      authAuditAction: GapAutoFillSchedulerAuditAction.GET_LOGS,
    });

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
