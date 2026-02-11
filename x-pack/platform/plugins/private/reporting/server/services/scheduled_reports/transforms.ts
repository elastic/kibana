/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObject,
  SavedObjectsFindResponse,
  SavedObjectsFindResult,
} from '@kbn/core/server';
import type { Logger } from '@kbn/core/server';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { RRule } from '@kbn/rrule';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';
import type { ReportApiJSON } from '@kbn/reporting-common/types';
import type { BulkGetResult } from '@kbn/task-manager-plugin/server/task_store';
import { isOk } from '@kbn/task-manager-plugin/server/lib/result_type';
import type { BulkOperationError } from './types';
import type { ScheduledReportApiJson, ScheduledReportType } from '../../types';

const SCHEDULED_REPORT_ID_FIELD = 'scheduled_report_id';
const CREATED_AT_FIELD = 'created_at';

interface ListApiResponse {
  page: number;
  per_page: number;
  total: number;
  data: ScheduledReportApiJson[];
}

export type CreatedAtSearchResponse = SearchResponse<{ created_at: string }>;

export function transformSingleResponse(
  logger: Logger,
  so: SavedObjectsFindResult<ScheduledReportType> | SavedObject<ScheduledReportType>,
  lastResponse?: CreatedAtSearchResponse,
  nextRunResponse?: BulkGetResult
): ScheduledReportApiJson {
  const id = so.id;
  const lastRunForId = (lastResponse?.hits.hits ?? []).find(
    (hit) => hit.fields?.[SCHEDULED_REPORT_ID_FIELD]?.[0] === id
  );
  const nextRunForId = (nextRunResponse ?? []).find(
    (taskOrError) => isOk(taskOrError) && taskOrError.value.id === id
  );

  let nextRun: string | undefined;
  if (!nextRunForId) {
    // try to calculate dynamically if we were not able to get from the task
    const schedule = so.attributes.schedule;

    // get start date
    let dtstart = new Date();
    const rruleStart = schedule.rrule.dtstart;
    if (rruleStart) {
      try {
        // if start date is provided and in the future, use it, otherwise use current time
        const startDateValue = new Date(rruleStart).valueOf();
        const now = Date.now();
        if (startDateValue > now) {
          dtstart = new Date(startDateValue + 60000); // add 1 minute to ensure it's in the future
        }
      } catch (e) {
        logger.debug(
          `Failed to parse rrule.dtstart for scheduled report next run calculation - default to now ${id}: ${e.message}`
        );
      }
    }
    const _rrule = new RRule({ ...schedule.rrule, dtstart });
    nextRun = _rrule.after(new Date())?.toISOString();
  } else {
    nextRun = isOk(nextRunForId) ? nextRunForId.value.runAt.toISOString() : undefined;
  }

  let payload: ReportApiJSON['payload'] | undefined;
  try {
    payload = JSON.parse(so.attributes.payload);
  } catch (e) {
    logger.warn(`Failed to parse payload for scheduled report ${id}: ${e.message}`);
  }

  return {
    id,
    created_at: so.attributes.createdAt,
    created_by: so.attributes.createdBy,
    enabled: so.attributes.enabled,
    jobtype: so.attributes.jobType,
    last_run: lastRunForId?._source?.[CREATED_AT_FIELD],
    next_run: nextRun,
    notification: so.attributes.notification,
    payload,
    schedule: so.attributes.schedule,
    space_id: so.namespaces?.[0] ?? DEFAULT_SPACE_ID,
    title: so.attributes.title,
  };
}

export function transformListResponse(
  logger: Logger,
  result: SavedObjectsFindResponse<ScheduledReportType>,
  lastResponse?: CreatedAtSearchResponse,
  nextRunResponse?: BulkGetResult
): ListApiResponse {
  return {
    page: result.page,
    per_page: result.per_page,
    total: result.total,
    data: result.saved_objects.map((so) =>
      transformSingleResponse(logger, so, lastResponse, nextRunResponse)
    ),
  };
}

export function transformBulkDeleteResponse({
  deletedSchedulesIds,
  errors,
}: {
  deletedSchedulesIds: string[];
  errors: BulkOperationError[];
}) {
  return {
    scheduled_report_ids: deletedSchedulesIds,
    errors,
    total: deletedSchedulesIds.length + errors.length,
  };
}
