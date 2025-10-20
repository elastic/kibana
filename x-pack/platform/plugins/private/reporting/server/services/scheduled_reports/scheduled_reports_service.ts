/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AuditLogger,
  IClusterClient,
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
  SavedObject,
  SavedObjectsBulkDeleteStatus,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { REPORTING_DATA_STREAM_WILDCARD_WITH_LEGACY } from '@kbn/reporting-server';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { partition } from 'lodash';
import type { ReportingCore } from '../..';
import type { ListScheduledReportApiJSON, ReportingUser, ScheduledReportType } from '../../types';
import { SCHEDULED_REPORT_SAVED_OBJECT_TYPE } from '../../saved_objects';
import type { ScheduledReportAuditEventParams } from '../audit_events/audit_events';
import {
  ScheduledReportAuditAction,
  scheduledReportAuditEvent,
} from '../audit_events/audit_events';
import { DEFAULT_SCHEDULED_REPORT_LIST_SIZE } from './constants';
import { transformBulkDeleteResponse, transformListResponse } from './transforms';
import type { BulkOperationError } from './types';

const SCHEDULED_REPORT_ID_FIELD = 'scheduled_report_id';
const CREATED_AT_FIELD = 'created_at';

interface ListScheduledReportsApiResponse {
  page: number;
  per_page: number;
  total: number;
  data: ListScheduledReportApiJSON[];
}

interface BulkDisableResult {
  scheduled_report_ids: string[];
  errors: BulkOperationError[];
  total: number;
}

interface BulkDeleteResult {
  scheduled_report_ids: string[];
  errors: BulkOperationError[];
  total: number;
}

export type CreatedAtSearchResponse = SearchResponse<{ created_at: string }>;

export class ScheduledReportsService {
  constructor(
    private auditLogger: AuditLogger,
    private userCanManageReporting: Boolean,
    private esClient: IClusterClient,
    private logger: Logger,
    private responseFactory: KibanaResponseFactory,
    private savedObjectsClient: SavedObjectsClientContract,
    private taskManager: TaskManagerStartContract
  ) {}

  static async build({
    logger,
    reportingCore,
    responseFactory,
    request,
  }: {
    logger: Logger;
    reportingCore: ReportingCore;
    responseFactory: KibanaResponseFactory;
    request: KibanaRequest;
  }) {
    const esClient = await reportingCore.getEsClient();
    const auditLogger = await reportingCore.getAuditLogger(request);
    const savedObjectsClient = await reportingCore.getScopedSoClient(request);
    const taskManager = await reportingCore.getTaskManager();
    const userCanManageReporting = await reportingCore.canManageReportingForSpace(request);

    return new ScheduledReportsService(
      auditLogger,
      userCanManageReporting,
      esClient,
      logger,
      responseFactory,
      savedObjectsClient,
      taskManager
    );
  }

  public async list({
    user,
    page = 1,
    size = DEFAULT_SCHEDULED_REPORT_LIST_SIZE,
  }: {
    user: ReportingUser;
    page: number;
    size: number;
  }): Promise<ListScheduledReportsApiResponse> {
    try {
      const username = this.getUsername(user);

      const response = await this.savedObjectsClient.find<ScheduledReportType>({
        type: SCHEDULED_REPORT_SAVED_OBJECT_TYPE,
        page,
        perPage: size,
        ...(!this.userCanManageReporting
          ? { filter: `scheduled_report.attributes.createdBy: "${username}"` }
          : {}),
      });

      if (!response) {
        return this.getEmptyListApiResponse(page, size);
      }

      const scheduledReportIdsAndName = response?.saved_objects.map((so) => ({
        id: so.id,
        name: so.attributes.title,
      }));

      if (!scheduledReportIdsAndName || scheduledReportIdsAndName.length === 0) {
        return this.getEmptyListApiResponse(page, size);
      }

      scheduledReportIdsAndName.forEach(({ id, name }) =>
        this.auditLog({ action: ScheduledReportAuditAction.LIST, id, name })
      );

      const scheduledReportIds = scheduledReportIdsAndName.map(({ id }) => id);

      let lastRunResponse;
      try {
        lastRunResponse = (await this.esClient.asInternalUser.search({
          index: REPORTING_DATA_STREAM_WILDCARD_WITH_LEGACY,
          size,
          _source: [CREATED_AT_FIELD],
          sort: [{ [CREATED_AT_FIELD]: { order: 'desc' } }],
          query: {
            bool: {
              filter: [
                {
                  terms: {
                    [SCHEDULED_REPORT_ID_FIELD]: scheduledReportIds,
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
        this.logger.warn(`Error getting last run for scheduled reports: ${error.message}`);
      }

      let nextRunResponse;
      try {
        nextRunResponse = await this.taskManager.bulkGet(scheduledReportIds);
      } catch (error) {
        // swallow this error
        this.logger.warn(`Error getting next run for scheduled reports: ${error.message}`);
      }

      return transformListResponse(this.logger, response, lastRunResponse, nextRunResponse);
    } catch (error) {
      throw this.responseFactory.customError({
        statusCode: 500,
        body: `Error listing scheduled reports: ${error.message}`,
      });
    }
  }

  public async bulkDisable({
    ids,
    user,
  }: {
    ids: string[];
    user: ReportingUser;
  }): Promise<BulkDisableResult> {
    try {
      let taskIdsToDisable: string[] = [];
      const bulkErrors: BulkOperationError[] = [];
      const disabledScheduledReportIds: Set<string> = new Set();
      const username = this.getUsername(user);

      const bulkGetResult = await this.savedObjectsClient.bulkGet<ScheduledReportType>(
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
          if (so.attributes.createdBy !== username && !this.userCanManageReporting) {
            bulkErrors.push({
              message: `Not found.`,
              status: 404,
              id: so.id,
            });
            this.logger.warn(
              `User "${username}" attempted to disable scheduled report "${so.id}" created by "${so.attributes.createdBy}" without sufficient privileges.`
            );
            this.auditLog({
              action: ScheduledReportAuditAction.DISABLE,
              id: so.id,
              name: so?.attributes?.title,
              error: new Error('Not found.'),
            });
          } else if (so.attributes.enabled === false) {
            this.logger.debug(`Scheduled report ${so.id} is already disabled`);
            disabledScheduledReportIds.add(so.id);
          } else {
            this.auditLog({
              action: ScheduledReportAuditAction.DISABLE,
              id: so.id,
              name: so.attributes.title,
              outcome: 'unknown',
            });
            scheduledReportSavedObjectsToUpdate.push(so);
          }
        }
      }

      // nothing to update, return early
      if (scheduledReportSavedObjectsToUpdate.length > 0) {
        const bulkUpdateResult = await this.savedObjectsClient.bulkUpdate<ScheduledReportType>(
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
            this.auditLog({
              action: ScheduledReportAuditAction.DISABLE,
              id: so.id,
              name: so?.attributes?.title,
              error: new Error(so.error.message),
            });
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

      const resultFromDisablingTasks = await this.taskManager.bulkDisable(taskIdsToDisable);
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
      throw this.responseFactory.customError({
        statusCode: 500,
        body: `Error disabling scheduled reports: ${error.message}`,
      });
    }
  }

  public async bulkDelete({
    ids,
    user,
  }: {
    ids: string[];
    user: ReportingUser;
  }): Promise<BulkDeleteResult> {
    try {
      const username = this.getUsername(user);

      const bulkGetResult = await this.savedObjectsClient.bulkGet<ScheduledReportType>(
        ids.map((id) => ({ id, type: SCHEDULED_REPORT_SAVED_OBJECT_TYPE }))
      );

      const [validSchedules, bulkGetErrors] = partition(
        bulkGetResult.saved_objects,
        (so) => so.error === undefined
      );
      const [authorizedSchedules, unauthorizedSchedules] = partition(
        validSchedules,
        (so) => so.attributes.createdBy === username || this.userCanManageReporting
      );

      const authErrors = this.formatAndAuditBulkDeleteAuthErrors({
        bulkGetErrors,
        unauthorizedSchedules,
        username,
      });
      this.auditBulkGetAuthorized({
        action: ScheduledReportAuditAction.DELETE,
        authorizedSchedules,
      });

      if (authorizedSchedules.length === 0) {
        return transformBulkDeleteResponse({
          deletedSchedulesIds: [],
          errors: authErrors,
        });
      }

      const bulkDeleteResult = await this.savedObjectsClient.bulkDelete(
        authorizedSchedules.map((so) => ({
          id: so.id,
          type: so.type,
        }))
      );
      const [deletedSchedules, bulkDeleteErrors] = partition(
        bulkDeleteResult.statuses,
        (status) => status.error === undefined
      );
      const executionErrors = this.formatAndAuditBulkDeleteSchedulesErrors({
        errorStatuses: bulkDeleteErrors,
      });

      const removeTasksResult = await this.taskManager.bulkRemove(
        deletedSchedules.map((so) => so.id)
      );
      const [removedTasks, erroredTasks] = partition(removeTasksResult.statuses, (status) =>
        Boolean(status.success)
      );
      const taskErrors = this.formatBulkDeleteTaskErrors({
        errorStatuses: erroredTasks,
      });

      return transformBulkDeleteResponse({
        deletedSchedulesIds: removedTasks.map((task) => task.id),
        errors: [...authErrors, ...executionErrors, ...taskErrors],
      });
    } catch (error) {
      throw this.responseFactory.customError({
        statusCode: 500,
        body: `Error deleting scheduled reports: ${error.message}`,
      });
    }
  }

  private auditBulkGetAuthorized({
    action,
    authorizedSchedules,
  }: {
    action: ScheduledReportAuditAction;
    authorizedSchedules: SavedObject<ScheduledReportType>[];
  }) {
    authorizedSchedules.forEach((so) => {
      this.auditLog({
        action,
        id: so.id,
        name: so.attributes.title,
        outcome: 'unknown',
      });
    });
  }

  private formatAndAuditBulkDeleteAuthErrors({
    bulkGetErrors,
    unauthorizedSchedules,
    username,
  }: {
    bulkGetErrors: SavedObject<ScheduledReportType>[];
    unauthorizedSchedules: SavedObject<ScheduledReportType>[];
    username: string | boolean;
  }) {
    const bulkErrors: BulkOperationError[] = [];
    bulkGetErrors.forEach((so) => {
      if (!so.error) {
        return;
      }
      bulkErrors.push({
        message: so.error.message,
        status: so.error.statusCode,
        id: so.id,
      });
    });
    unauthorizedSchedules.forEach((so) => {
      bulkErrors.push({
        message: `Not found.`,
        status: 404,
        id: so.id,
      });
      this.logger.warn(
        `User "${username}" attempted to delete scheduled report "${so.id}" created by "${so.attributes.createdBy}" without sufficient privileges.`
      );
      this.auditLog({
        action: ScheduledReportAuditAction.DELETE,
        id: so.id,
        name: so?.attributes?.title,
        outcome: 'failure',
        error: new Error(`Not found.`),
      });
    });
    return bulkErrors;
  }

  private formatAndAuditBulkDeleteSchedulesErrors({
    errorStatuses,
  }: {
    errorStatuses: SavedObjectsBulkDeleteStatus[];
  }) {
    const bulkErrors: BulkOperationError[] = [];
    errorStatuses.forEach((status) => {
      if (!status.error) {
        return;
      }
      bulkErrors.push({
        message: status.error.message,
        status: status.error.statusCode,
        id: status.id,
      });
      this.auditLog({
        action: ScheduledReportAuditAction.DELETE,
        id: status.id,
        error: new Error(status.error.message),
      });
    });
    return bulkErrors;
  }

  private formatBulkDeleteTaskErrors({
    errorStatuses,
  }: {
    errorStatuses: SavedObjectsBulkDeleteStatus[];
  }) {
    const bulkErrors: BulkOperationError[] = [];
    errorStatuses.forEach((error) => {
      if (error.error == null) {
        return;
      }
      bulkErrors.push({
        message: `Scheduled report deleted but task deleting failed due to: ${error.error.message}`,
        status: error.error.statusCode,
        id: error.id,
      });
    });
    return bulkErrors;
  }

  private getUsername(user: ReportingUser): string | boolean {
    return user ? user.username : false;
  }

  private getEmptyListApiResponse(page: number, perPage: number): ListScheduledReportsApiResponse {
    return {
      page,
      per_page: perPage,
      total: 0,
      data: [],
    };
  }

  private auditLog({
    action,
    id,
    name,
    outcome,
    error,
  }: ScheduledReportAuditEventParams & { id: string; name?: string }) {
    this.auditLogger.log(
      scheduledReportAuditEvent({
        action,
        savedObject: {
          type: SCHEDULED_REPORT_SAVED_OBJECT_TYPE,
          id,
          name,
        },
        outcome,
        error,
      })
    );
  }
}
