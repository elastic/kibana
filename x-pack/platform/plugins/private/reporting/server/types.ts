/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomRequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { IKibanaResponse } from '@kbn/core/server';
import type { IRouter } from '@kbn/core-http-server';
import type { DataPluginStart } from '@kbn/data-plugin/server/plugin';
import type { DiscoverServerPluginStart } from '@kbn/discover-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/server';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { ReportSource, UrlOrUrlLocatorTuple } from '@kbn/reporting-common/types';
import type { ReportApiJSON } from '@kbn/reporting-common/types';
import type { ReportingConfigType } from '@kbn/reporting-server';
import type { ScreenshotModePluginSetup } from '@kbn/screenshot-mode-plugin/server';
import type {
  PdfScreenshotOptions as BasePdfScreenshotOptions,
  PngScreenshotOptions as BasePngScreenshotOptions,
  ScreenshottingStart,
} from '@kbn/screenshotting-plugin/server';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import type { SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import type {
  RruleSchedule,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';

import type { ExportTypesRegistry } from '@kbn/reporting-server/export_types_registry';
import type { AuthenticatedUser } from '@kbn/core-security-common';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import type { NotificationsPluginStart } from '@kbn/notifications-plugin/server';
import type {
  RawNotification,
  RawScheduledReport,
} from './saved_objects/scheduled_report/schemas/latest';
import type {
  GenerateSystemReportRequestParams,
  HandleResponseFunc,
} from './routes/common/request_handler/generate_system_report_request_handler';

/**
 * Plugin Setup Contract
 */
export interface ReportingSetup {
  registerExportTypes: ExportTypesRegistry['register'];
  /**
   * Process a user request to generate a report
   * that requires accessing system indices as an internal user.
   * Plugins should encapsulate the use of this function with their own authorization checks.
   */
  handleGenerateSystemReportRequest: (
    path: string,
    requestParams: GenerateSystemReportRequestParams,
    handleResponseFunc: HandleResponseFunc
  ) => Promise<IKibanaResponse>;
}

/**
 * Plugin Start Contract
 */
export type ReportingStart = ReportingSetup;
export type ReportingUser = AuthenticatedUser | undefined;

export type ScrollConfig = ReportingConfigType['csv']['scroll'];

export interface ReportingSetupDeps {
  actions: ActionsPluginSetupContract;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  features: FeaturesPluginSetup;
  licensing: LicensingPluginSetup;
  screenshotMode: ScreenshotModePluginSetup;
  taskManager: TaskManagerSetupContract;
  security?: SecurityPluginSetup;
  spaces?: SpacesPluginSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface ReportingStartDeps {
  data: DataPluginStart;
  discover: DiscoverServerPluginStart;
  fieldFormats: FieldFormatsStart;
  licensing: LicensingPluginStart;
  notifications: NotificationsPluginStart;
  taskManager: TaskManagerStartContract;
  security?: SecurityPluginStart;
  screenshotting?: ScreenshottingStart;
}

export type ReportingRequestHandlerContext = CustomRequestHandlerContext<{
  reporting: ReportingStart | null;
}>;

export type ReportingPluginRouter = IRouter<ReportingRequestHandlerContext>;

/**
 * Interface of a response to an HTTP request for our plugin to generate a report.
 * @public
 */
export interface ReportingJobResponse {
  /**
   * Contractual field with Watcher: used to automate download of the report once it is finished
   * @public
   */
  path: string;
  /**
   * Details of a new report job that was requested
   * @public
   */
  job: ReportApiJSON;
}

export type ScheduledReportApiJSON = Omit<
  ReportSource,
  'attempts' | 'migration_version' | 'output' | 'payload' | 'status'
> & {
  id: string;
  migration_version?: string;
  notification?: RawNotification;
  payload: Omit<ReportSource['payload'], 'headers'>;
  schedule: RruleSchedule;
};

export interface ScheduledReportingJobResponse {
  /**
   * Details of a new report job that was requested
   * @public
   */
  job: ScheduledReportApiJSON;
}

export type ScheduledReportType = Omit<RawScheduledReport, 'schedule'> & {
  schedule: RruleSchedule;
};

export interface ListScheduledReportApiJSON {
  id: string;
  created_at: RawScheduledReport['createdAt'];
  created_by: RawScheduledReport['createdBy'];
  enabled: RawScheduledReport['enabled'];
  jobtype: RawScheduledReport['jobType'];
  last_run: string | undefined;
  next_run: string | undefined;
  notification: RawScheduledReport['notification'];
  payload?: ReportApiJSON['payload'];
  schedule: RruleSchedule;
  space_id: string;
  title: RawScheduledReport['title'];
}

export type ScheduledReportApiJson = ListScheduledReportApiJSON;

export interface PdfScreenshotOptions extends Omit<BasePdfScreenshotOptions, 'timeouts' | 'urls'> {
  urls: UrlOrUrlLocatorTuple[];
}

export interface PngScreenshotOptions extends Omit<BasePngScreenshotOptions, 'timeouts' | 'urls'> {
  urls: UrlOrUrlLocatorTuple[];
}

export interface ScheduledReportTemplateVariables {
  title: string;
  filename: string;
  objectType: string;
  date?: string;
}
