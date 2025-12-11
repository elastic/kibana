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
  SavedObjectsBulkUpdateResponse,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { REPORTING_DATA_STREAM_WILDCARD_WITH_LEGACY } from '@kbn/reporting-server';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { partition } from 'lodash';
import type { ReportingCore } from '../..';
import type {
  ListScheduledReportApiJSON,
  ReportingUser,
  ScheduledReportApiJson,
  ScheduledReportType,
} from '../../types';
import { SCHEDULED_REPORT_SAVED_OBJECT_TYPE } from '../../saved_objects';
import type { ScheduledReportAuditEventParams } from '../audit_events/audit_events';
import {
  ScheduledReportAuditAction,
  scheduledReportAuditEvent,
} from '../audit_events/audit_events';
import { DEFAULT_SCHEDULED_REPORT_LIST_SIZE } from './constants';
import { transformBulkDeleteResponse, transformListResponse } from './transforms';
import type { BulkOperationError } from './types';
import { transformSingleResponse } from './transforms';
import type { UpdateScheduledReportParams } from './types/update';
import { updateScheduledReportSchema } from './schemas/update';

const SCHEDULED_REPORT_ID_FIELD = 'scheduled_report_id';
const CREATED_AT_FIELD = 'created_at';

interface ListScheduledReportsApiResponse {
  page: number;
  per_page: number;
  total: number;
  data: ListScheduledReportApiJSON[];
}

interface BulkOperationResult {
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
    private taskManager: TaskManagerStartContract,
    private request: KibanaRequest
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
      taskManager,
      request
    );
  }

  public async update({
    user,
    id,
    updateParams,
  }: {
    user: ReportingUser;
    id: string;
    updateParams: UpdateScheduledReportParams;
  }): Promise<ScheduledReportApiJson> {
    try {
      updateScheduledReportSchema.validate(updateParams);
    } catch (error) {
      throw this.responseFactory.badRequest({
        body: `Error validating params for update scheduled report - ${error.message}`,
      });
    }

    if (!(await this._canUpdateReport({ id, user }))) {
      this._throw404({ user, id, action: ScheduledReportAuditAction.UPDATE });
    }

    try {
      const { title, schedule, notification } = updateParams;

      await this._updateScheduledReportSavedObject({ id, title, schedule, notification });
      await this._updateScheduledReportTaskSchedule({ id, schedule });

      const updatedReport = await this.savedObjectsClient.get<ScheduledReportType>(
        SCHEDULED_REPORT_SAVED_OBJECT_TYPE,
        id
      );

      this._auditLog({
        action: ScheduledReportAuditAction.UPDATE,
        id,
        name: updatedReport.attributes.title,
      });

      return transformSingleResponse(this.logger, updatedReport);
    } catch (error) {
      throw this.responseFactory.customError({
        statusCode: 500,
        body: `Error updating scheduled reports: ${error.message}`,
      });
    }
  }

  public async list({
    user,
    page = 1,
    size = DEFAULT_SCHEDULED_REPORT_LIST_SIZE,
    search,
  }: {
    user: ReportingUser;
    page: number;
    size: number;
    search?: string;
  }): Promise<ListScheduledReportsApiResponse> {
    try {
      const username = this._getUsername(user);

      const response = await this.savedObjectsClient.find<ScheduledReportType>({
        type: SCHEDULED_REPORT_SAVED_OBJECT_TYPE,
        page,
        perPage: size,
        search,
        searchFields: ['title', 'created_by'],
        ...(!this.userCanManageReporting
          ? { filter: `scheduled_report.attributes.createdBy: "${username}"` }
          : {}),
      });

      if (!response) {
        return this._getEmptyListApiResponse(page, size);
      }

      const scheduledReportIdsAndName = response?.saved_objects.map((so) => ({
        id: so.id,
        name: so.attributes.title,
      }));

      if (!scheduledReportIdsAndName || scheduledReportIdsAndName.length === 0) {
        return this._getEmptyListApiResponse(page, size);
      }

      scheduledReportIdsAndName.forEach(({ id, name }) =>
        this._auditLog({ action: ScheduledReportAuditAction.LIST, id, name })
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
  }): Promise<BulkOperationResult> {
    return this._bulkOperation({
      enable: false,
      ids,
      user,
    });
  }

  public async bulkEnable({
    ids,
    user,
  }: {
    ids: string[];
    user: ReportingUser;
  }): Promise<BulkOperationResult> {
    return this._bulkOperation({
      enable: true,
      ids,
      user,
    });
  }

  public async bulkDelete({
    ids,
    user,
  }: {
    ids: string[];
    user: ReportingUser;
  }): Promise<BulkOperationResult> {
    try {
      const username = this._getUsername(user);

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

      const authErrors = this._formatAndAuditBulkDeleteAuthErrors({
        bulkGetErrors,
        unauthorizedSchedules,
        username,
      });
      this._auditBulkGetAuthorized({
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
      const executionErrors = this._formatAndAuditBulkDeleteSchedulesErrors({
        errorStatuses: bulkDeleteErrors,
      });

      const removeTasksResult = await this.taskManager.bulkRemove(
        deletedSchedules.map((so) => so.id)
      );
      const [removedTasks, erroredTasks] = partition(removeTasksResult.statuses, (status) =>
        Boolean(status.success)
      );
      const taskErrors = this._formatBulkDeleteTaskErrors({
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

  private _auditBulkGetAuthorized({
    action,
    authorizedSchedules,
  }: {
    action: ScheduledReportAuditAction;
    authorizedSchedules: SavedObject<ScheduledReportType>[];
  }) {
    authorizedSchedules.forEach((so) => {
      this._auditLog({
        action,
        id: so.id,
        name: so.attributes.title,
        outcome: 'unknown',
      });
    });
  }

  private _formatAndAuditBulkDeleteAuthErrors({
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
      this._auditLog({
        action: ScheduledReportAuditAction.DELETE,
        id: so.id,
        name: so?.attributes?.title,
        outcome: 'failure',
        error: new Error(`Not found.`),
      });
    });
    return bulkErrors;
  }

  private _formatAndAuditBulkDeleteSchedulesErrors({
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
      this._auditLog({
        action: ScheduledReportAuditAction.DELETE,
        id: status.id,
        error: new Error(status.error.message),
      });
    });
    return bulkErrors;
  }

  private _formatBulkDeleteTaskErrors({
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

  private _getUsername(user: ReportingUser): string | boolean {
    return user ? user.username : false;
  }

  private _getEmptyListApiResponse(page: number, perPage: number): ListScheduledReportsApiResponse {
    return {
      page,
      per_page: perPage,
      total: 0,
      data: [],
    };
  }

  private _auditLog({
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

  private async _updateScheduledReportSavedObject({
    id,
    title,
    schedule,
    notification,
  }: { id: string } & UpdateScheduledReportParams) {
    await this.savedObjectsClient.update<ScheduledReportType>(
      SCHEDULED_REPORT_SAVED_OBJECT_TYPE,
      id,
      {
        title,
        schedule,
        notification,
      }
    );
  }

  private async _updateScheduledReportTaskSchedule({
    id,
    schedule,
  }: { id: string } & UpdateScheduledReportParams) {
    if (schedule) {
      await this.taskManager.bulkUpdateSchedules([id], schedule, { request: this.request });
    }
  }

  private async _canUpdateReport({
    user,
    id,
  }: {
    user: ReportingUser;
    id: string;
  }): Promise<Boolean> {
    if (this.userCanManageReporting) return true;

    const username = this._getUsername(user);
    const reportToUpdate = await this.savedObjectsClient.get<ScheduledReportType>(
      SCHEDULED_REPORT_SAVED_OBJECT_TYPE,
      id
    );

    return reportToUpdate.attributes.createdBy === username;
  }

  private async _bulkOperation({
    enable,
    ids,
    user,
  }: {
    enable: boolean;
    ids: string[];
    user: ReportingUser;
  }): Promise<BulkOperationResult> {
    try {
      let taskIdsToUpdate: string[] = [];

      const bulkGetResult = await this.savedObjectsClient.bulkGet<ScheduledReportType>(
        ids.map((id) => ({ id, type: SCHEDULED_REPORT_SAVED_OBJECT_TYPE }))
      );

      const {
        errors: bulkErrors,
        scheduledReportSavedObjectsToUpdate,
        updatedScheduledReportIds: enabledScheduledReportIds,
      } = await this._addLogForBulkOperationScheduledReports({
        action: enable ? ScheduledReportAuditAction.ENABLE : ScheduledReportAuditAction.DISABLE,
        scheduledReportSavedObjects: bulkGetResult.saved_objects,
        user,
        operation: enable ? 'enable' : 'disable',
      });

      // nothing to update, return early
      if (scheduledReportSavedObjectsToUpdate.length > 0) {
        const bulkUpdateResult = await this._updateScheduledReportSavedObjectEnabledState({
          scheduledReportSavedObjectsToUpdate,
          shouldEnable: enable,
        });

        for (const so of bulkUpdateResult.saved_objects) {
          if (so.error) {
            bulkErrors.push({
              message: so.error.message,
              status: so.error.statusCode,
              id: so.id,
            });
            this._auditLog({
              action: enable
                ? ScheduledReportAuditAction.ENABLE
                : ScheduledReportAuditAction.DISABLE,
              id: so.id,
              name: so?.attributes?.title,
              error: new Error(so.error.message),
            });
          } else {
            taskIdsToUpdate.push(so.id);
          }
        }
      } else {
        return {
          scheduled_report_ids: [...enabledScheduledReportIds],
          errors: bulkErrors,
          total: enabledScheduledReportIds.size + bulkErrors.length,
        };
      }

      taskIdsToUpdate = taskIdsToUpdate.concat([...enabledScheduledReportIds]);

      return this._updateScheduledReportTaskEnabledState({
        taskIdsToUpdate,
        shouldEnable: enable,
        bulkErrors,
        updatedScheduledReportIds: enabledScheduledReportIds,
      });
    } catch (error) {
      throw this.responseFactory.customError({
        statusCode: 500,
        body: `Error ${enable ? 'enabling' : 'disabling'} scheduled reports: ${error.message}`,
      });
    }
  }

  private async _updateScheduledReportSavedObjectEnabledState({
    scheduledReportSavedObjectsToUpdate,
    shouldEnable,
  }: {
    scheduledReportSavedObjectsToUpdate: Array<SavedObject<ScheduledReportType>>;
    shouldEnable: boolean;
  }): Promise<SavedObjectsBulkUpdateResponse<ScheduledReportType>> {
    return await this.savedObjectsClient.bulkUpdate<ScheduledReportType>(
      scheduledReportSavedObjectsToUpdate.map((so) => ({
        id: so.id,
        type: so.type,
        attributes: {
          enabled: shouldEnable,
        },
      }))
    );
  }

  private async _addLogForBulkOperationScheduledReports({
    action,
    scheduledReportSavedObjects,
    user,
    operation,
  }: {
    action: ScheduledReportAuditAction;
    user: ReportingUser;
    scheduledReportSavedObjects: SavedObject<ScheduledReportType>[];
    operation: 'enable' | 'disable';
  }) {
    const errors: BulkOperationError[] = [];
    const scheduledReportSavedObjectsToUpdate: Array<SavedObject<ScheduledReportType>> = [];
    const username = this._getUsername(user);
    const updatedScheduledReportIds: Set<string> = new Set();

    for (const so of scheduledReportSavedObjects) {
      if (so.error) {
        errors.push({
          message: so.error.message,
          status: so.error.statusCode,
          id: so.id,
        });
      } else {
        // check if user is allowed to update this scheduled report
        if (so.attributes.createdBy !== username && !this.userCanManageReporting) {
          errors.push({
            message: `Not found.`,
            status: 404,
            id: so.id,
          });
          this.logger.warn(
            `User "${username}" attempted to ${operation} scheduled report "${so.id}" created by "${so.attributes.createdBy}" without sufficient privileges.`
          );
          this._auditLog({
            action,
            id: so.id,
            name: so?.attributes?.title,
            error: new Error('Not found.'),
          });
        } else if (operation === 'disable' && so.attributes.enabled === false) {
          this.logger.debug(`Scheduled report ${so.id} is already disabled`);
          updatedScheduledReportIds.add(so.id);
        } else if (operation === 'enable' && so.attributes.enabled === true) {
          this.logger.debug(`Scheduled report ${so.id} is already enabled`);
          updatedScheduledReportIds.add(so.id);
        } else {
          this._auditLog({
            action,
            id: so.id,
            name: so.attributes.title,
            outcome: 'unknown',
          });
          scheduledReportSavedObjectsToUpdate.push(so);
        }
      }
    }
    return { errors, scheduledReportSavedObjectsToUpdate, updatedScheduledReportIds };
  }

  private async _updateScheduledReportTaskEnabledState({
    taskIdsToUpdate,
    shouldEnable,
    bulkErrors,
    updatedScheduledReportIds,
  }: {
    taskIdsToUpdate: string[];
    shouldEnable: boolean;
    bulkErrors: BulkOperationError[];
    updatedScheduledReportIds: Set<string>;
  }) {
    const resultFromUpdatingTasks = shouldEnable
      ? await this.taskManager.bulkEnable(taskIdsToUpdate, false)
      : await this.taskManager.bulkDisable(taskIdsToUpdate);

    for (const error of resultFromUpdatingTasks.errors) {
      bulkErrors.push({
        message: `Scheduled report ${shouldEnable ? 'enabled' : 'disabled'} but task ${
          shouldEnable ? 'enabling' : 'disabling'
        } failed due to: ${error.error.message}`,
        status: error.error.statusCode,
        id: error.id,
      });
    }

    for (const result of resultFromUpdatingTasks.tasks) {
      updatedScheduledReportIds.add(result.id);
    }

    return {
      scheduled_report_ids: [...updatedScheduledReportIds],
      errors: bulkErrors,
      total: updatedScheduledReportIds.size + bulkErrors.length,
    };
  }

  private _throw404({
    user,
    id,
    action,
  }: {
    user: ReportingUser;
    id: string;
    action: ScheduledReportAuditAction;
  }) {
    const username = this._getUsername(user);
    this.logger.warn(
      `User "${username}" attempted to update scheduled report "${id}" without sufficient privileges.`
    );
    this._auditLog({
      action,
      id,
      error: new Error('Not found.'),
    });
    throw this.responseFactory.customError({
      statusCode: 404,
      body: 'Not found.',
    });
  }
}
