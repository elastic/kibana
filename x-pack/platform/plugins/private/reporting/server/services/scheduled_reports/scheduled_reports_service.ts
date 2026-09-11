/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AuditLogger,
  IClusterClient,
  IKibanaResponse,
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
  SavedObject,
  SavedObjectErrorResult,
  SavedObjectsBulkDeleteStatus,
  SavedObjectsBulkUpdateResponse,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core/server';
import { REPORTING_DATA_STREAM_WILDCARD_WITH_LEGACY } from '@kbn/reporting-server';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { KueryNode } from '@kbn/es-query';
import { partition } from 'lodash';
import type { ReportingCore } from '../..';
import type {
  ListScheduledReportApiJSON,
  ReportingUser,
  ScheduledReportApiJson,
  ScheduledReportType,
} from '../../types';
import { SCHEDULED_REPORT_SAVED_OBJECT_TYPE } from '../../saved_objects';
import type { ReportingUserIdentity } from '../../lib';
import { getReportingUserIdentity } from '../../lib';
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
import { buildOwnedByFilter, isScheduledReportOwner } from './lib/ownership';

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
  private identityPromise?: Promise<ReportingUserIdentity>;

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

    const { authorized, upgradeCreatedById } = await this._canUpdateReport({ id, user });
    if (!authorized) {
      throw await this._buildNotFoundError({ user, id, action: ScheduledReportAuditAction.UPDATE });
    }

    try {
      const { title, schedule, notification } = updateParams;

      await this._updateScheduledReportSavedObject({
        id,
        title,
        schedule,
        notification,
        createdById: upgradeCreatedById,
      });
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
      const identity = await this._getIdentity(user);

      let filter: KueryNode | undefined;
      if (!this.userCanManageReporting) {
        filter = buildOwnedByFilter(identity);
        if (!filter) {
          return this._getEmptyListApiResponse(page, size);
        }
      }

      const response = await this.savedObjectsClient.find<ScheduledReportType>({
        type: SCHEDULED_REPORT_SAVED_OBJECT_TYPE,
        page,
        perPage: size,
        search,
        searchFields: ['title', 'created_by'],
        ...(filter ? { filter } : {}),
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
      const identity = await this._getIdentity(user);

      const bulkGetResult = await this.savedObjectsClient.bulkGet<ScheduledReportType>(
        ids.map((id) => ({ id, type: SCHEDULED_REPORT_SAVED_OBJECT_TYPE }))
      );

      const validSchedules = bulkGetResult.saved_objects.filter(
        (so): so is SavedObject<ScheduledReportType> => !isSavedObjectErrorResult(so)
      );
      const bulkGetErrors = bulkGetResult.saved_objects.filter(isSavedObjectErrorResult);
      const [authorizedSchedules, unauthorizedSchedules] = partition(
        validSchedules,
        (so) =>
          this.userCanManageReporting ||
          isScheduledReportOwner({ report: so.attributes, currentUser: identity })
      );

      const authErrors = this._formatAndAuditBulkDeleteAuthErrors({
        bulkGetErrors,
        unauthorizedSchedules,
        username: identity.username,
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
    bulkGetErrors: SavedObjectErrorResult[];
    unauthorizedSchedules: SavedObject<ScheduledReportType>[];
    username?: string;
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

  /** Resolves the acting principal's identity once per service instance (one per request). */
  private async _getIdentity(user: ReportingUser): Promise<ReportingUserIdentity> {
    if (!this.identityPromise) {
      this.identityPromise = getReportingUserIdentity({
        user,
        request: this.request,
        esClient: this.esClient,
      });
    }
    return this.identityPromise;
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
    createdById,
  }: { id: string; createdById?: string } & UpdateScheduledReportParams) {
    await this.savedObjectsClient.update<ScheduledReportType>(
      SCHEDULED_REPORT_SAVED_OBJECT_TYPE,
      id,
      {
        title,
        schedule,
        notification,
        ...(createdById ? { createdById } : {}),
      }
    );
  }

  private async _updateScheduledReportTaskSchedule({
    id,
    schedule,
  }: { id: string } & UpdateScheduledReportParams) {
    if (schedule) {
      await this.taskManager.bulkUpdateSchedules([id], schedule, {
        request: this.request,
        regenerateApiKey: true,
      });
    }
  }

  /**
   * Checks whether `user` may update the scheduled report `id`. `upgradeCreatedById` is set when
   * the report is a legacy document matched by username alone, and must be written back on the
   * update so subsequent requests match on the stable id instead.
   */
  private async _canUpdateReport({
    user,
    id,
  }: {
    user: ReportingUser;
    id: string;
  }): Promise<{ authorized: boolean; upgradeCreatedById?: string }> {
    if (this.userCanManageReporting) {
      return { authorized: true };
    }

    const identity = await this._getIdentity(user);
    const reportToUpdate = await this.savedObjectsClient.get<ScheduledReportType>(
      SCHEDULED_REPORT_SAVED_OBJECT_TYPE,
      id
    );

    if (!isScheduledReportOwner({ report: reportToUpdate.attributes, currentUser: identity })) {
      return { authorized: false };
    }

    const upgradeCreatedById =
      reportToUpdate.attributes.createdById === undefined && identity.id !== undefined
        ? identity.id
        : undefined;

    return { authorized: true, upgradeCreatedById };
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
        createdByIdUpgrades,
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
          createdByIdUpgrades,
        });

        for (const so of bulkUpdateResult.saved_objects) {
          if (isSavedObjectErrorResult(so)) {
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
              name: undefined,
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
    createdByIdUpgrades,
  }: {
    scheduledReportSavedObjectsToUpdate: Array<SavedObject<ScheduledReportType>>;
    shouldEnable: boolean;
    createdByIdUpgrades: Map<string, string>;
  }): Promise<SavedObjectsBulkUpdateResponse<ScheduledReportType>> {
    return await this.savedObjectsClient.bulkUpdate<ScheduledReportType>(
      scheduledReportSavedObjectsToUpdate.map((so) => {
        const createdById = createdByIdUpgrades.get(so.id);
        return {
          id: so.id,
          type: so.type,
          attributes: {
            enabled: shouldEnable,
            ...(createdById ? { createdById } : {}),
          },
        };
      })
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
    scheduledReportSavedObjects: Array<SavedObject<ScheduledReportType> | SavedObjectErrorResult>;
    operation: 'enable' | 'disable';
  }) {
    const errors: BulkOperationError[] = [];
    const scheduledReportSavedObjectsToUpdate: Array<SavedObject<ScheduledReportType>> = [];
    const identity = await this._getIdentity(user);
    const updatedScheduledReportIds: Set<string> = new Set();
    const createdByIdUpgrades: Map<string, string> = new Map();

    for (const so of scheduledReportSavedObjects) {
      if (isSavedObjectErrorResult(so)) {
        errors.push({
          message: so.error.message,
          status: so.error.statusCode,
          id: so.id,
        });
      } else {
        // check if user is allowed to update this scheduled report
        if (
          !this.userCanManageReporting &&
          !isScheduledReportOwner({ report: so.attributes, currentUser: identity })
        ) {
          errors.push({
            message: `Not found.`,
            status: 404,
            id: so.id,
          });
          this.logger.warn(
            `User "${identity.username}" attempted to ${operation} scheduled report "${so.id}" created by "${so.attributes.createdBy}" without sufficient privileges.`
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
          if (
            !this.userCanManageReporting &&
            so.attributes.createdById === undefined &&
            identity.id !== undefined
          ) {
            createdByIdUpgrades.set(so.id, identity.id);
          }
        }
      }
    }
    return {
      errors,
      scheduledReportSavedObjectsToUpdate,
      updatedScheduledReportIds,
      createdByIdUpgrades,
    };
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
      ? await this.taskManager.bulkEnable(taskIdsToUpdate, false, { request: this.request })
      : await this.taskManager.bulkDisable(taskIdsToUpdate, false, { request: this.request });

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

  private async _buildNotFoundError({
    user,
    id,
    action,
  }: {
    user: ReportingUser;
    id: string;
    action: ScheduledReportAuditAction;
  }): Promise<IKibanaResponse> {
    const identity = await this._getIdentity(user);
    this.logger.warn(
      `User "${identity.username}" attempted to update scheduled report "${id}" without sufficient privileges.`
    );
    this._auditLog({
      action,
      id,
      error: new Error('Not found.'),
    });
    return this.responseFactory.customError({
      statusCode: 404,
      body: 'Not found.',
    });
  }
}
