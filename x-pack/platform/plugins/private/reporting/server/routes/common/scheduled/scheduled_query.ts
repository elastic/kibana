/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type {
  ElasticsearchClient,
  KibanaRequest,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from '@kbn/core/server';
import { REPORTING_DATA_STREAM_WILDCARD_WITH_LEGACY } from '@kbn/reporting-server';
import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { RRule } from '@kbn/rrule';
import type { ReportingCore } from '../../..';
import type {
  ListScheduledReportApiJSON,
  ReportingUser,
  ScheduledReportType,
} from '../../../types';
import { SCHEDULED_REPORT_SAVED_OBJECT_TYPE } from '../../../saved_objects';

export const MAX_SCHEDULED_REPORT_LIST_SIZE = 100;
export const DEFAULT_SCHEDULED_REPORT_LIST_SIZE = 10;

// TODO - remove .keyword when mapping is fixed
const SCHEDULED_REPORT_ID_FIELD = 'scheduled_report_id.keyword';
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

export type CreatedAtSearchResponse = SearchResponse<{ created_at: string }>;

export function transformResponse(
  result: SavedObjectsFindResponse<ScheduledReportType>,
  lastResponse: CreatedAtSearchResponse
): ApiResponse {
  return {
    page: result.page,
    per_page: result.per_page,
    total: result.total,
    data: result.saved_objects.map((so) => {
      const id = so.id;
      const lastRunForId = lastResponse.hits.hits.find(
        (hit) => hit.fields?.[SCHEDULED_REPORT_ID_FIELD]?.[0] === id
      );

      const schedule = so.attributes.schedule;
      const _rrule = new RRule({
        ...schedule.rrule,
        dtstart: new Date(),
      });

      return {
        id,
        created_at: so.attributes.createdAt,
        created_by: so.attributes.createdBy,
        enabled: so.attributes.enabled,
        jobtype: so.attributes.jobType,
        last_run: lastRunForId?._source?.[CREATED_AT_FIELD],
        next_run: _rrule.after(new Date())?.toISOString(),
        notification: so.attributes.notification,
        schedule: so.attributes.schedule,
        title: so.attributes.title,
      };
    }),
  };
}

export interface ScheduledQueryFactory {
  list(req: KibanaRequest, user: ReportingUser, page: number, size: number): Promise<ApiResponse>;
  bulkDisable(req: KibanaRequest, ids: string[], user: ReportingUser): Promise<void>;
}

export function scheduledQueryFactory(reportingCore: ReportingCore): ScheduledQueryFactory {
  return {
    async list(req, user, page = 1, size = DEFAULT_SCHEDULED_REPORT_LIST_SIZE) {
      const esClient = await reportingCore.getEsClient();
      const savedObjectsClient = await reportingCore.getSoClient(req);
      const username = getUsername(user);

      // if user has Manage Reporting privileges, we can list
      // scheduled reports for all users in this space, otherwise
      // we will filter only to the scheduled reports created by the user
      const canManageReporting = await reportingCore.canManageReportingForSpace(req);

      const response = await savedObjectsClient.find<ScheduledReportType>({
        type: SCHEDULED_REPORT_SAVED_OBJECT_TYPE,
        page,
        perPage: size,
        ...(!canManageReporting ? { filter: `createdBy: "${username}"` } : {}),
      });

      if (!response) {
        return getEmptyApiResponse(page, size);
      }

      const scheduledReportSoIds = response?.saved_objects.map((so) => so.id);

      if (!scheduledReportSoIds || scheduledReportSoIds.length === 0) {
        return getEmptyApiResponse(page, size);
      }

      const lastRunResponse = (await esClient.asInternalUser.search({
        index: REPORTING_DATA_STREAM_WILDCARD_WITH_LEGACY,
        size,
        _source: [CREATED_AT_FIELD],
        sort: [{ [CREATED_AT_FIELD]: { order: 'desc' } }],
        query: {
          bool: {
            filter: [
              {
                terms: {
                  [SCHEDULED_REPORT_ID_FIELD]: scheduledReportSoIds,
                },
              },
            ],
          },
        },
        collapse: { field: SCHEDULED_REPORT_ID_FIELD },
      })) as CreatedAtSearchResponse;

      return transformResponse(response, lastRunResponse);
    },

    async bulkDisable(req, ids, user) {
      const savedObjectsClient = await reportingCore.getSoClient(req);
      const taskManager = await reportingCore.getTaskManager();

      const bulkErrors: BulkOperationError[] = [];
      const username = getUsername(user);

      // if user has Manage Reporting privileges, they can disable
      // scheduled reports for all users in this space
      const canManageReporting = await reportingCore.canManageReportingForSpace(req);

      const bulkGetResult = await savedObjectsClient.bulkGet<ScheduledReportType>(
        ids.map((id) => ({ id, type: SCHEDULED_REPORT_SAVED_OBJECT_TYPE }))
      );

      if (!bulkGetResult || bulkGetResult.saved_objects.length === 0) {
        return;
      }

      // check if the response contains reports that are not owned by the user
      // if it does and user does not have Manage Reporting privileges, throw an error
      const hasOtherUsersReports = bulkGetResult.saved_objects.some((so) => {
        const { createdBy } = so.attributes;
        return createdBy !== username;
      });

      if (hasOtherUsersReports && !canManageReporting) {
        throw new Error('Insufficient privileges to disable scheduled reports from other users');
      }

      const bulkUpdateResult = await savedObjectsClient.bulkUpdate<ScheduledReportType>(
        bulkGetResult.saved_objects.map((so) => ({
          id: so.id,
          type: so.type,
          attributes: {
            enabled: false,
          },
        }))
      );

      const tasksIdsToDisable: string[] = [];
      bulkUpdateResult?.saved_objects.forEach((so) => {
        if (so.error) {
          bulkErrors.push({
            message: so.error.message,
            status: so.error.statusCode,
            id: so.id,
          });
        } else {
          tasksIdsToDisable.push(so.id);
        }
      });

      const resultFromDisablingTasks = await taskManager.bulkDisable(tasksIdsToDisable);

      if (resultFromDisablingTasks.tasks.length) {
        logger.debug(
          `Successfully disabled schedules for underlying tasks: ${resultFromDisablingTasks.tasks
            .map((task) => task.id)
            .join(', ')}`
        );
      }
      if (resultFromDisablingTasks.errors.length) {
        logger.error(
          `Failure to disable schedules for underlying tasks: ${resultFromDisablingTasks.errors
            .map((error) => error.id)
            .join(', ')}`
        );
      }
    },
  };
}

// {
//   "saved_objects": [
//       {
//           "id": "aa8b6fb3-cf61-4903-bce3-eec9ddc823ca",
//           "type": "scheduled_report",
//           "namespaces": [
//               "default"
//           ],
//           "updated_at": "2025-05-06T21:10:17.137Z",
//           "created_at": "2025-05-06T21:10:17.137Z",
//           "version": "WzEsMV0=",
//           "attributes": {
//               "createdAt": "2025-05-06T21:10:17.137Z",
//               "createdBy": "elastic",
//               "enabled": true,
//               "jobType": "printable_pdf_v2",
//               "meta": {
//                   "isDeprecated": false,
//                   "layout": "preserve_layout",
//                   "objectType": "dashboard"
//               },
//               "migrationVersion": "9.1.0",
//               "title": "[Logs] Web Traffic",
//               "payload": "{\"browserTimezone\":\"America/New_York\",\"layout\":{\"dimensions\":{\"height\":2220,\"width\":1364},\"id\":\"preserve_layout\"},\"objectType\":\"dashboard\",\"title\":\"[Logs] Web Traffic\",\"version\":\"9.1.0\",\"locatorParams\":[{\"id\":\"DASHBOARD_APP_LOCATOR\",\"params\":{\"dashboardId\":\"edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b\",\"preserveSavedFilters\":true,\"timeRange\":{\"from\":\"now-7d/d\",\"to\":\"now\"},\"useHash\":false,\"viewMode\":\"view\"}}],\"isDeprecated\":false}",
//               "schedule": {
//                   "rrule": {
//                       "freq": 3,
//                       "interval": 3,
//                       "byhour": [
//                           12
//                       ],
//                       "byminute": [
//                           0
//                       ],
//                       "tzid": "UTC"
//                   }
//               }
//           },
//           "references": [],
//           "managed": false,
//           "coreMigrationVersion": "8.8.0",
//           "typeMigrationVersion": "10.1.0"
//       },
//       {
//           "id": "2da1cb75-04c7-4202-a9f0-f8bcce63b0f4",
//           "type": "scheduled_report",
//           "namespaces": [
//               "default"
//           ],
//           "updated_at": "2025-05-06T21:12:06.584Z",
//           "created_at": "2025-05-06T21:12:06.584Z",
//           "version": "WzIsMV0=",
//           "attributes": {
//               "createdAt": "2025-05-06T21:12:06.584Z",
//               "createdBy": "elastic",
//               "enabled": true,
//               "jobType": "PNGV2",
//               "meta": {
//                   "isDeprecated": false,
//                   "layout": "preserve_layout",
//                   "objectType": "dashboard"
//               },
//               "migrationVersion": "9.1.0",
//               "notification": {
//                   "email": {
//                       "to": [
//                           "ying.mao@elastic.co"
//                       ]
//                   }
//               },
//               "title": "[Logs] Web Traffic",
//               "payload": "{\"browserTimezone\":\"America/New_York\",\"layout\":{\"dimensions\":{\"height\":2220,\"width\":1364},\"id\":\"preserve_layout\"},\"objectType\":\"dashboard\",\"title\":\"[Logs] Web Traffic\",\"version\":\"9.1.0\",\"locatorParams\":[{\"id\":\"DASHBOARD_APP_LOCATOR\",\"params\":{\"dashboardId\":\"edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b\",\"preserveSavedFilters\":true,\"timeRange\":{\"from\":\"now-7d/d\",\"to\":\"now\"},\"useHash\":false,\"viewMode\":\"view\"}}],\"isDeprecated\":false}",
//               "schedule": {
//                   "rrule": {
//                       "freq": 1,
//                       "interval": 3,
//                       "tzid": "UTC"
//                   }
//               }
//           },
//           "references": [],
//           "managed": false,
//           "coreMigrationVersion": "8.8.0",
//           "typeMigrationVersion": "10.1.0"
//       }
//   ]
// }
