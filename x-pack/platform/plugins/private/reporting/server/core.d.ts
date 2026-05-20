import * as Rx from 'rxjs';
import type { AnalyticsServiceStart, CoreSetup, DocLinksServiceSetup, IBasePath, IClusterClient, KibanaRequest, Logger, PackageInfo, PluginInitializerContext, SavedObjectsServiceStart, SecurityServiceStart, StatusServiceSetup, UiSettingsServiceStart } from '@kbn/core/server';
import type { PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';
import type { PluginStart as DataPluginStart } from '@kbn/data-plugin/server';
import type { DiscoverServerPluginStart } from '@kbn/discover-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { ReportingHealthInfo, ReportingServerInfo } from '@kbn/reporting-common/types';
import type { ReportingConfigType } from '@kbn/reporting-server';
import type { ScreenshottingStart } from '@kbn/screenshotting-plugin/server';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import type { SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import type { TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { NotificationsPluginStart } from '@kbn/notifications-plugin/server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import type { ExportTypesRegistry } from '@kbn/reporting-server/export_types_registry';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/public';
import type { ReportingSetup } from '.';
import type { IReport, ReportingStore } from './lib/store';
import type { ReportTaskParams, ScheduledReportTaskParamsWithoutSpaceId } from './lib/tasks';
import type { ReportingPluginRouter } from './types';
import { EventTracker } from './usage';
export interface ReportingInternalSetup {
    actions: ActionsPluginSetupContract;
    basePath: Pick<IBasePath, 'set'>;
    docLinks: DocLinksServiceSetup;
    encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
    features: FeaturesPluginSetup;
    licensing: LicensingPluginSetup;
    logger: Logger;
    router: ReportingPluginRouter;
    security?: SecurityPluginSetup;
    spaces?: SpacesPluginSetup;
    status: StatusServiceSetup;
    taskManager: TaskManagerSetupContract;
    usageCounter?: UsageCounter;
}
export interface ReportingInternalStart {
    store: ReportingStore;
    analytics: AnalyticsServiceStart;
    savedObjects: SavedObjectsServiceStart;
    uiSettings: UiSettingsServiceStart;
    esClient: IClusterClient;
    data: DataPluginStart;
    discover: DiscoverServerPluginStart;
    fieldFormats: FieldFormatsStart;
    licensing: LicensingPluginStart;
    logger: Logger;
    notifications: NotificationsPluginStart;
    screenshotting?: ScreenshottingStart;
    security?: SecurityPluginStart;
    securityService: SecurityServiceStart;
    taskManager: TaskManagerStartContract;
}
/**
 * @internal
 */
export declare class ReportingCore {
    private core;
    private logger;
    private exportTypesRegistry;
    private context;
    private packageInfo;
    private pluginSetupDeps?;
    private pluginStartDeps?;
    private readonly pluginSetup$;
    private readonly pluginStart$;
    private runSingleReportTask;
    private runScheduledReportTask;
    private config;
    private executing;
    getContract: () => ReportingSetup;
    private kibanaShuttingDown$;
    constructor(core: CoreSetup, logger: Logger, exportTypesRegistry: ExportTypesRegistry, context: PluginInitializerContext<ReportingConfigType>);
    getKibanaPackageInfo(): PackageInfo;
    pluginSetup(setupDeps: ReportingInternalSetup): void;
    pluginStart(startDeps: ReportingInternalStart): Promise<void>;
    pluginStop(): void;
    getKibanaShutdown$(): Rx.Observable<void>;
    pluginSetsUp(): Promise<boolean>;
    pluginStartsUp(): Promise<boolean>;
    pluginIsStarted(): boolean;
    setConfig(config: ReportingConfigType): void;
    /**
     * Validate export types with config settings
     * only CSV export types should be registered in the export types registry for serverless
     */
    private getExportTypes;
    getServerInfo(): ReportingServerInfo;
    getHealthInfo(): Promise<ReportingHealthInfo>;
    canManageReportingForSpace(req: KibanaRequest): Promise<boolean>;
    getConfig(): ReportingConfigType;
    getUsageCounter(): UsageCounter | undefined;
    getEventTracker(reportId: string, exportType: string, objectType: string): EventTracker | undefined;
    getPluginStartDeps(): Promise<ReportingInternalStart>;
    getExportTypesRegistry(): ExportTypesRegistry;
    scheduleTask(request: KibanaRequest, report: ReportTaskParams): Promise<import("@kbn/task-manager-plugin/server").ConcreteTaskInstance>;
    scheduleTaskWithInternalES(request: KibanaRequest, report: ReportTaskParams): Promise<import("@kbn/task-manager-plugin/server").ConcreteTaskInstance>;
    scheduleRecurringTask(request: KibanaRequest, report: ScheduledReportTaskParamsWithoutSpaceId): Promise<import("@kbn/task-manager-plugin/server").ConcreteTaskInstance>;
    getStore(): Promise<ReportingStore>;
    getAuditLogger(request: KibanaRequest): Promise<import("@kbn/core/server").AuditLogger>;
    getLicenseInfo(): Promise<Record<string, import("@kbn/reporting-server/check_license").LicenseCheckResult>>;
    isSecurityEnabled(): Promise<boolean | null>;
    validateNotificationEmails(emails: string[]): string | undefined;
    getPluginSetupDeps(): ReportingInternalSetup;
    getDataViewsService(request: KibanaRequest): Promise<import("@kbn/data-plugin/server").DataViewsCommonService>;
    getScopedSoClient(request: KibanaRequest): Promise<import("@kbn/core/server").SavedObjectsClientContract>;
    getInternalSoClient(): Promise<import("@kbn/core/server").ISavedObjectsRepository>;
    getTaskManager(): Promise<TaskManagerStartContract>;
    getDataService(): Promise<DataPluginStart>;
    getEsClient(): Promise<IClusterClient>;
    getSpaceId(request: KibanaRequest, logger?: Logger): string | undefined;
    trackReport(reportId: string): void;
    untrackReport(reportId: string): void;
    countConcurrentReports(): number;
    getEventLogger(report: IReport, task?: {
        id: string;
    }): {
        readonly eventObj: import("./lib/event_logger/logger").BaseEvent;
        readonly report: IReport;
        readonly task?: {
            id: string;
        };
        completionLogger: import("./lib/event_logger/logger").IReportingEventLogger;
        logScheduleTask(): import("./lib/event_logger/types").ScheduledTask;
        logExecutionStart(): import("./lib/event_logger/types").StartedExecution;
        logExecutionComplete({ byteSize, csv, pdf, png, }: import("./lib/event_logger/logger").ExecutionCompleteMetrics): import("./lib/event_logger/types").CompletedExecution;
        logError(error: import("./lib/event_logger/types").ErrorAction): import("./lib/event_logger/types").ExecuteError;
        logClaimTask({ queueDurationMs }: import("./lib/event_logger/logger").ExecutionClaimMetrics): import("./lib/event_logger/types").ClaimedTask;
        logReportFailure(): import("./lib/event_logger/types").FailedReport;
        logReportSaved(): import("./lib/event_logger/types").SavedReport;
        logRetry(): import("./lib/event_logger/types").ScheduledRetry;
    };
}
