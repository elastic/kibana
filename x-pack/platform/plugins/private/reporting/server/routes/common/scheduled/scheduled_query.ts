/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KibanaRequest,
  KibanaResponseFactory,
  SavedObject,
  SavedObjectsFindResponse,
  SavedObjectsFindResult,
} from '@kbn/core/server';
import type { Logger } from '@kbn/core/server';
import { REPORTING_DATA_STREAM_WILDCARD_WITH_LEGACY } from '@kbn/reporting-server';
import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { RRule } from '@kbn/rrule';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';
import { ReportApiJSON } from '@kbn/reporting-common/types';
import type { ReportingCore } from '../../..';
import type {
  ListScheduledReportApiJSON,
  ReportingUser,
  ScheduledReportType,
} from '../../../types';
import { SCHEDULED_REPORT_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import { ScheduledReportAuditAction, scheduledReportAuditEvent } from '../audit_events';

export const MAX_SCHEDULED_REPORT_LIST_SIZE = 100;
export const DEFAULT_SCHEDULED_REPORT_LIST_SIZE = 10;

const SCHEDULED_REPORT_ID_FIELD = 'scheduled_report_id';
const CREATED_AT_FIELD = 'created_at';
const getUsername = (user: ReportingUser) => (user ? user.username : false);

interface ApiResponse {
  page: number;
  per_page: number;
  total: number;
  data: ListScheduledReportApiJSON[];
}

const getEmptyApiResponse = (page: number, perPage: number) => ({
  page,
  per_page: perPage,
  total: 0,
  data: [],
});

interface BulkOperationError {
  message: string;
  status?: number;
  id: string;
}

interface BulkDisableResult {
  scheduled_report_ids: string[];
  errors: BulkOperationError[];
  total: number;
}

export type CreatedAtSearchResponse = SearchResponse<{ created_at: string }>;

export function transformSingleResponse(
  logger: Logger,
  so: SavedObjectsFindResult<ScheduledReportType>,
  lastResponse?: CreatedAtSearchResponse
) {
  const id = so.id;
  const lastRunForId = (lastResponse?.hits.hits ?? []).find(
    (hit) => hit.fields?.[SCHEDULED_REPORT_ID_FIELD]?.[0] === id
  );

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
    next_run: _rrule.after(new Date())?.toISOString(),
    notification: so.attributes.notification,
    payload,
    schedule: so.attributes.schedule,
    space_id: so.namespaces?.[0] ?? DEFAULT_SPACE_ID,
    title: so.attributes.title,
  };
}

export function transformResponse(
  logger: Logger,
  result: SavedObjectsFindResponse<ScheduledReportType>,
  lastResponse?: CreatedAtSearchResponse
): ApiResponse {
  return {
    page: result.page,
    per_page: result.per_page,
    total: result.total,
    data: result.saved_objects.map((so) => transformSingleResponse(logger, so, lastResponse)),
  };
}

export interface ScheduledQueryFactory {
  list(
    logger: Logger,
    req: KibanaRequest,
    res: KibanaResponseFactory,
    user: ReportingUser,
    page: number,
    size: number
  ): Promise<ApiResponse>;
  bulkDisable(
    logger: Logger,
    req: KibanaRequest,
    res: KibanaResponseFactory,
    ids: string[],
    user: ReportingUser
  ): Promise<BulkDisableResult>;
}

export function scheduledQueryFactory(reportingCore: ReportingCore): ScheduledQueryFactory {
  return {
    async list(logger, req, res, user, page = 1, size = DEFAULT_SCHEDULED_REPORT_LIST_SIZE) {
      try {
        const esClient = await reportingCore.getEsClient();
        const auditLogger = await reportingCore.getAuditLogger(req);
        const savedObjectsClient = await reportingCore.getScopedSoClient(req);
        const username = getUsername(user);

        // if user has Manage Reporting privileges, we can list
        // scheduled reports for all users in this space, otherwise
        // we will filter only to the scheduled reports created by the user
        const canManageReporting = await reportingCore.canManageReportingForSpace(req);

        const response = await savedObjectsClient.find<ScheduledReportType>({
          type: SCHEDULED_REPORT_SAVED_OBJECT_TYPE,
          page,
          perPage: size,
          ...(!canManageReporting
            ? { filter: `scheduled_report.attributes.createdBy: "${username}"` }
            : {}),
        });

        if (!response) {
          return getEmptyApiResponse(page, size);
        }

        const scheduledReportIdsAndName = response?.saved_objects.map((so) => ({
          id: so.id,
          name: so.attributes.title,
        }));

        if (!scheduledReportIdsAndName || scheduledReportIdsAndName.length === 0) {
          return getEmptyApiResponse(page, size);
        }

        scheduledReportIdsAndName.forEach(({ id, name }) =>
          auditLogger.log(
            scheduledReportAuditEvent({
              action: ScheduledReportAuditAction.LIST,
              savedObject: {
                type: SCHEDULED_REPORT_SAVED_OBJECT_TYPE,
                id,
                name,
              },
            })
          )
        );

        let lastRunResponse;
        try {
          lastRunResponse = (await esClient.asInternalUser.search({
            index: REPORTING_DATA_STREAM_WILDCARD_WITH_LEGACY,
            size,
            _source: [CREATED_AT_FIELD],
            sort: [{ [CREATED_AT_FIELD]: { order: 'desc' } }],
            query: {
              bool: {
                filter: [
                  {
                    terms: {
                      [SCHEDULED_REPORT_ID_FIELD]: scheduledReportIdsAndName.map(({ id }) => id),
                    },
                  },
                ],
              },
            },
            collapse: { field: SCHEDULED_REPORT_ID_FIELD },
          })) as CreatedAtSearchResponse;
        } catch (error) {
          // if no scheduled reports have run yet, we will get an error from the collapse query
          // ignore these and return an empty last run
          logger.warn(`Error getting last run for scheduled reports: ${error.message}`);
        }

        return transformResponse(logger, response, lastRunResponse);
      } catch (error) {
        throw res.customError({
          statusCode: 500,
          body: `Error listing scheduled reports: ${error.message}`,
        });
      }
    },

    async bulkDisable(logger, req, res, ids, user) {
      try {
        const savedObjectsClient = await reportingCore.getScopedSoClient(req);
        const taskManager = await reportingCore.getTaskManager();
        const auditLogger = await reportingCore.getAuditLogger(req);

        const bulkErrors: BulkOperationError[] = [];
        const disabledScheduledReportIds: Set<string> = new Set();
        let taskIdsToDisable: string[] = [];

        const username = getUsername(user);

        // if user has Manage Reporting privileges, they can disable
        // scheduled reports for all users in this space
        const canManageReporting = await reportingCore.canManageReportingForSpace(req);

        const bulkGetResult = await savedObjectsClient.bulkGet<ScheduledReportType>(
          ids.map((id) => ({ id, type: SCHEDULED_REPORT_SAVED_OBJECT_TYPE }))
        );

        const scheduledReportSavedObjectsToUpdate: Array<SavedObject<ScheduledReportType>> = [];
        for (const so of bulkGetResult.saved_objects) {
          if (so.error) {
            bulkErrors.push({
              message: so.error.message,
              status: so.error.statusCode,
              id: so.id,
            });
          } else {
            // check if user is allowed to update this scheduled report
            if (so.attributes.createdBy !== username && !canManageReporting) {
              bulkErrors.push({
                message: `Not found.`,
                status: 404,
                id: so.id,
              });
              logger.warn(
                `User "${username}" attempted to disable scheduled report "${so.id}" created by "${so.attributes.createdBy}" without sufficient privileges.`
              );
              auditLogger.log(
                scheduledReportAuditEvent({
                  action: ScheduledReportAuditAction.DISABLE,
                  savedObject: {
                    type: SCHEDULED_REPORT_SAVED_OBJECT_TYPE,
                    id: so.id,
                    name: so?.attributes?.title,
                  },
                  error: new Error(`Not found.`),
                })
              );
            } else if (so.attributes.enabled === false) {
              logger.debug(`Scheduled report ${so.id} is already disabled`);
              disabledScheduledReportIds.add(so.id);
            } else {
              auditLogger.log(
                scheduledReportAuditEvent({
                  action: ScheduledReportAuditAction.DISABLE,
                  savedObject: {
                    type: SCHEDULED_REPORT_SAVED_OBJECT_TYPE,
                    id: so.id,
                    name: so.attributes.title,
                  },
                  outcome: 'unknown',
                })
              );
              scheduledReportSavedObjectsToUpdate.push(so);
            }
          }
        }

        // nothing to update, return early
        if (scheduledReportSavedObjectsToUpdate.length > 0) {
          const bulkUpdateResult = await savedObjectsClient.bulkUpdate<ScheduledReportType>(
            scheduledReportSavedObjectsToUpdate.map((so) => ({
              id: so.id,
              type: so.type,
              attributes: {
                enabled: false,
              },
            }))
          );

          for (const so of bulkUpdateResult.saved_objects) {
            if (so.error) {
              bulkErrors.push({
                message: so.error.message,
                status: so.error.statusCode,
                id: so.id,
              });
              auditLogger.log(
                scheduledReportAuditEvent({
                  action: ScheduledReportAuditAction.DISABLE,
                  savedObject: {
                    type: SCHEDULED_REPORT_SAVED_OBJECT_TYPE,
                    id: so.id,
                    name: so?.attributes?.title,
                  },
                  error: new Error(so.error.message),
                })
              );
            } else {
              taskIdsToDisable.push(so.id);
            }
          }
        } else {
          return {
            scheduled_report_ids: [...disabledScheduledReportIds],
            errors: bulkErrors,
            total: disabledScheduledReportIds.size + bulkErrors.length,
          };
        }

        // it's possible that the scheduled_report saved object was disabled but
        // task disabling failed so add the list of already disabled IDs
        // task manager filters out disabled tasks so this will not cause extra load
        taskIdsToDisable = taskIdsToDisable.concat([...disabledScheduledReportIds]);

        const resultFromDisablingTasks = await taskManager.bulkDisable(taskIdsToDisable);
        for (const error of resultFromDisablingTasks.errors) {
          bulkErrors.push({
            message: `Scheduled report disabled but task disabling failed due to: ${error.error.message}`,
            status: error.error.statusCode,
            id: error.id,
          });
        }

        for (const result of resultFromDisablingTasks.tasks) {
          disabledScheduledReportIds.add(result.id);
        }

        return {
          scheduled_report_ids: [...disabledScheduledReportIds],
          errors: bulkErrors,
          total: disabledScheduledReportIds.size + bulkErrors.length,
        };
      } catch (error) {
        throw res.customError({
          statusCode: 500,
          body: `Error disabling scheduled reports: ${error.message}`,
        });
      }
    },
  };
}
