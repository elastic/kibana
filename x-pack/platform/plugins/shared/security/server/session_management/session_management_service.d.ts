import type { Observable } from 'rxjs';
import type { ElasticsearchClient, HttpServiceSetup, Logger } from '@kbn/core/server';
import type { AuditServiceSetup } from '@kbn/security-plugin-types-server';
import type { TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { Session } from './session';
import type { ConfigType } from '../config';
import type { OnlineStatusRetryScheduler } from '../elasticsearch';
export interface SessionManagementServiceSetupParams {
    readonly http: Pick<HttpServiceSetup, 'basePath' | 'createCookieSessionStorageFactory'>;
    readonly config: ConfigType;
    readonly taskManager: TaskManagerSetupContract;
}
export interface SessionManagementServiceStartParams {
    readonly elasticsearchClient: ElasticsearchClient;
    readonly kibanaIndexName: string;
    readonly online$: Observable<OnlineStatusRetryScheduler>;
    readonly taskManager: TaskManagerStartContract;
    readonly audit: AuditServiceSetup;
}
export interface SessionManagementServiceStart {
    readonly session: Session;
}
/**
 * Name of the task that is periodically run and performs session index cleanup.
 */
export declare const SESSION_INDEX_CLEANUP_TASK_NAME = "session_cleanup";
/**
 * Service responsible for the user session management.
 */
export declare class SessionManagementService {
    private readonly logger;
    private statusSubscription?;
    private sessionIndex;
    private sessionCookie;
    private config;
    private isCleanupTaskScheduled;
    constructor(logger: Logger);
    setup({ config, http, taskManager }: SessionManagementServiceSetupParams): void;
    start({ elasticsearchClient, kibanaIndexName, online$, taskManager, audit, }: SessionManagementServiceStartParams): SessionManagementServiceStart;
    stop(): void;
    private scheduleCleanupTask;
}
