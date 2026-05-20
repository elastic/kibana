import type { IndicesCreateRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AuditLogger } from '@kbn/security-plugin-types-server';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import type { AuthenticationProvider } from '../../common';
import type { ConfigType } from '../config';
export interface SessionIndexOptions {
    readonly elasticsearchClient: ElasticsearchClient;
    readonly kibanaIndexName: string;
    readonly config: Pick<ConfigType, 'session' | 'authc'>;
    readonly logger: Logger;
    readonly auditLogger: AuditLogger;
}
/**
 * Filter provided for the `SessionIndex.invalidate` method that determines which session index
 * values should be invalidated (removed from the index). It can have three possible types:
 *   - `all` means that all existing active and inactive sessions should be invalidated.
 *   - `sid` means that only session with the specified SID should be invalidated.
 *   - `query` means that only sessions that match specified query should be invalidated.
 */
export type InvalidateSessionsFilter = {
    match: 'all';
} | {
    match: 'sid';
    sid: string;
} | {
    match: 'query';
    query: {
        provider: {
            type: string;
            name?: string;
        };
        usernameHash?: string;
    };
};
/**
 * Name of the session index mappings _meta field storing session index version. Named after a field used for the
 * Elasticsearch security-specific indices with the same purpose.
 */
export declare const SESSION_INDEX_MAPPINGS_VERSION_META_FIELD_NAME = "security-version";
/**
 * Returns index settings that are used for the current version of the session index.
 */
export declare function getSessionIndexSettings({ indexName, aliasName, }: {
    indexName: string;
    aliasName: string;
}): IndicesCreateRequest;
/**
 * Represents shape of the session value stored in the index.
 */
export interface SessionIndexValue {
    /**
     * Unique session ID.
     */
    sid: string;
    /**
     * Hash of the username. It's defined only if session is authenticated, otherwise session
     * is considered unauthenticated (e.g. intermediate session used during SSO handshake).
     */
    usernameHash?: string;
    /**
     * Name and type of the provider this session belongs to.
     */
    provider: AuthenticationProvider;
    /**
     * The Unix time in ms when the session should be considered expired. If `null`, session will stay
     * active until the browser is closed.
     */
    idleTimeoutExpiration: number | null;
    /**
     * The Unix time in ms which is the max total lifespan of the session. If `null`, session expire
     * time can be extended indefinitely.
     */
    lifespanExpiration: number | null;
    /**
     * The Unix time in ms which is the time when the session was initially created. The missing value indicates that the
     * session was created before `createdAt` was introduced.
     */
    createdAt?: number;
    /**
     * Indicates whether user acknowledged access agreement or not.
     */
    accessAgreementAcknowledged?: boolean;
    /**
     * Content of the session value represented as an encrypted JSON string.
     */
    content: string;
    /**
     * Additional index specific information about the session value.
     */
    metadata: SessionIndexValueMetadata;
}
/**
 * Additional index specific information about the session value.
 */
interface SessionIndexValueMetadata {
    /**
     * Primary term of the last modification of the document.
     */
    primaryTerm: number;
    /**
     * Sequence number of the last modification of the document.
     */
    sequenceNumber: number;
}
export declare class SessionIndex {
    private readonly options;
    /**
     * Name of the index to store session information in.
     */
    private readonly indexName;
    /**
     * Name of the write alias to store session information in.
     */
    private readonly aliasName;
    /**
     * Promise that tracks session index initialization process. We'll need to get rid of this as soon
     * as Core provides support for plugin statuses (https://github.com/elastic/kibana/issues/41983).
     * With this we won't mark Security as `Green` until index is fully initialized and hence consumers
     * won't be able to call any APIs we provide.
     */
    private indexInitialization?;
    constructor(options: Readonly<SessionIndexOptions>);
    /**
     * Retrieves session value with the specified ID from the index. If session value isn't found
     * `null` will be returned.
     * @param sid Session ID.
     */
    get(sid: string): Promise<Readonly<SessionIndexValue> | null>;
    /**
     * Creates a new document for the specified session value.
     * @param sessionValue Session index value.
     */
    create(sessionValue: Readonly<Omit<SessionIndexValue, 'metadata'>>): Promise<SessionIndexValue>;
    /**
     * Re-indexes updated session value.
     * @param sessionValue Session index value.
     */
    update(sessionValue: Readonly<SessionIndexValue>): Promise<Readonly<SessionIndexValue> | null>;
    /**
     * Clears session value(s) determined by the specified filter.
     * @param filter Filter that narrows down the list of the session values that should be cleared.
     */
    invalidate(filter: InvalidateSessionsFilter): Promise<number>;
    /**
     * Initializes index that is used to store session values.
     */
    initialize(): Promise<void>;
    /**
     * Trigger a removal of any outdated session values.
     */
    cleanUp(taskManagerRunContext: RunContext): Promise<{
        state: {
            shardMissingCounter: any;
        };
        error?: undefined;
    } | {
        error: string;
        state: {
            shardMissingCounter: number;
        };
    }>;
    /**
     * Checks whether specific session is within a concurrent sessions limit.
     * @param sessionValue Session index value to check against concurrent sessions limit.
     */
    isWithinConcurrentSessionLimit(sessionValue: Readonly<SessionIndexValue>): Promise<boolean>;
    private attachAliasToIndex;
    /**
     * Creates the session index if it doesn't already exist.
     */
    private ensureSessionIndexExists;
    private writeNewSessionDocument;
    private updateExistingSessionDocument;
    /**
     * Fetches session values from session index in batches of 10,000.
     */
    private getSessionValuesInBatches;
    private getSessionsOutsideConcurrentSessionLimit;
    /**
     * Performs a bulk delete operation on the Kibana session index.
     * @param deleteOperations Bulk delete operations.
     * @returns Returns `true` if the bulk delete affected any session document.
     */
    private bulkDeleteSessions;
    /**
     * Refreshes Kibana session index. This is used as a part of the session index cleanup job only and hence doesn't
     * throw even if the operation fails.
     */
    private refreshSessionIndex;
}
export {};
