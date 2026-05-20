import type { IndicesDataStream, Result } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { LockManagerService } from '@kbn/lock-manager';
import type { Condition } from '@kbn/streamlang';
import type { RoutingStatus } from '@kbn/streams-schema';
import { Streams, LOGS_OTEL_STREAM_NAME, LOGS_ECS_STREAM_NAME } from '@kbn/streams-schema';
import type { StreamSummary } from '../../../common';
import type { QueryClient } from './assets/query/query_client';
import type { AttachmentClient } from './attachments/attachment_client';
import type { StreamsStorageClient } from './storage/streams_storage_client';
import type { FeatureClient } from './feature';
interface AcknowledgeResponse<TResult extends Result> {
    acknowledged: true;
    result: TResult;
}
export type EnableStreamsResponse = AcknowledgeResponse<'noop' | 'created'>;
export type DisableStreamsResponse = AcknowledgeResponse<'noop' | 'deleted'>;
export type DeleteStreamResponse = AcknowledgeResponse<'noop' | 'deleted'>;
export type SyncStreamResponse = AcknowledgeResponse<'updated' | 'created'>;
export type ForkStreamResponse = AcknowledgeResponse<'created'>;
export type ResyncStreamsResponse = AcknowledgeResponse<'updated'>;
export type UpsertStreamResponse = AcknowledgeResponse<'updated' | 'created'>;
export declare class StreamsClient {
    private readonly dependencies;
    constructor(dependencies: {
        lockManager: LockManagerService;
        esClientAsInternalUser: ElasticsearchClient;
        esClient: ElasticsearchClient;
        attachmentClient: AttachmentClient;
        getQueryClient?: () => Promise<QueryClient>;
        getFeatureClient?: () => Promise<FeatureClient>;
        storageClient: StreamsStorageClient;
        logger: Logger;
        isServerless: boolean;
        isSecurityEnabled: boolean;
        isWiredStreamViewsEnabled: boolean;
        isDev: boolean;
    });
    /**
     * Streams is considered enabled when:
     * - both new streams (logs.otel and logs.ecs) are enabled
     * - it throws if any stream has a conflict
     */
    isStreamsEnabled(): Promise<boolean>;
    checkStreamStatus(): Promise<{
        logs: boolean | 'conflict';
        [LOGS_OTEL_STREAM_NAME]: boolean | 'conflict';
        [LOGS_ECS_STREAM_NAME]: boolean | 'conflict';
    }>;
    /**
     * Checks if a specific root stream exists in Kibana storage
     */
    private checkRootStreamExists;
    /**
     * Checks which root streams exist in Kibana storage
     * Returns: { logs: boolean, 'logs.otel': boolean, 'logs.ecs': boolean }
     */
    private checkRootStreamsExistence;
    /**
     * Checks Elasticsearch enable status for all root streams
     * Returns: { logs: boolean, 'logs.otel': boolean, 'logs.ecs': boolean }
     */
    private checkElasticsearchStreamsStatus;
    /**
     * Materializes backing data streams for root wired streams that exist in
     * Kibana storage but are missing their backing ES data stream. This can
     * happen when enableStreams was previously called with defer: true.
     *
     * Returns true if any data streams were materialized, false otherwise.
     */
    private materializeDeferredRootDataStreams;
    /**
     * Enabling streams means creating the necessary root streams.
     * For fresh installs: creates logs.otel and logs.ecs
     * For existing users: keeps logs, adds logs.otel and logs.ecs
     *
     * If all required streams are already enabled, it is a noop.
     */
    enableStreams({ defer }?: {
        defer?: boolean;
    }): Promise<EnableStreamsResponse>;
    /**
     * Disabling streams means deleting root streams AND their descendants,
     * including any Elasticsearch objects, such as data streams.
     * That means it deletes all data belonging to wired streams.
     *
     * For legacy users (with logs stream): deletes all 3 streams
     * For new users: deletes only logs.otel and logs.ecs
     *
     * It does NOT delete classic streams.
     */
    disableStreams(): Promise<DisableStreamsResponse>;
    /**
     * Resyncing streams means re-installing all Elasticsearch
     * objects (index and component templates, pipelines, and
     * assets), using the stream definitions as the source of
     * truth.
     *
     * Streams are re-synced in a specific order:
     * the leaf nodes are synced first, then its parents, etc.
     * This prevents us from routing to data streams that do
     * not exist yet.
     */
    resyncStreams(): Promise<ResyncStreamsResponse>;
    /**
     * Creates or updates a stream. The routing of the parent is
     * also updated (including syncing to Elasticsearch).
     */
    upsertStream({ name, request, }: {
        name: string;
        request: Streams.all.UpsertRequest;
    }): Promise<UpsertStreamResponse>;
    bulkUpsert(streams: Array<{
        name: string;
        request: Streams.all.UpsertRequest;
    }>): Promise<{
        acknowledged: boolean;
        result: {
            created: string[];
            updated: string[];
        };
    }>;
    /**
     * Forks a stream into a child with a specific condition.
     */
    forkStream({ parent, name, where: condition, status, draft, }: {
        parent: string;
        name: string;
        where: Condition;
        status: RoutingStatus;
        draft?: boolean;
    }): Promise<ForkStreamResponse>;
    createQueryStream({ name, query, field_descriptions, }: {
        name: string;
        query: Streams.QueryStream.UpsertRequest['stream']['query'];
        field_descriptions?: Record<string, string>;
    }): Promise<UpsertStreamResponse>;
    /**
     * Make sure there is a stream definition for a given stream.
     * If the data stream exists but the stream definition does not, it creates an empty stream definition.
     * If the stream definition exists, it is a noop.
     * If the data stream does not exist or the user does not have access, it throws.
     */
    ensureStream(name: string): Promise<void>;
    private getStreamDefinitionFromSource;
    /**
     * Returns a stream definition for the given name:
     * - if a wired stream definition exists
     * - if an ingest stream definition exists
     * - if a data stream exists (creates an ingest definition on the fly)
     *
     * Throws when:
     * - no definition is found
     * - the user does not have access to the stream
     */
    getStream(name: string): Promise<Streams.all.Definition>;
    private getStoredStreamDefinition;
    getDataStream(name: string): Promise<IndicesDataStream>;
    /**
     * Checks whether the user has the required privileges to manage the stream (or streams).
     * Managing a stream means updating the stream properties. It does not
     * include the dashboard links.
     *
     * In case multiple streams are provided, it checks whether the user has
     * the required privileges on all streams, and returns the least-privileged
     * result.
     */
    getPrivileges(nameOrNames: string | string[]): Promise<{
        manage: boolean;
        monitor: boolean;
        view_index_metadata: boolean;
        lifecycle: boolean;
        simulate: boolean;
        text_structure: boolean;
        read_failure_store: boolean;
        manage_failure_store: boolean;
        create_snapshot_repository: boolean;
    }>;
    getPrivilegesPerStream(names: string[]): Promise<Record<string, {
        read_failure_store: boolean;
    }>>;
    /**
     * Creates an on-the-fly ingest stream definition
     * from a concrete data stream.
     */
    private getDataStreamAsIngestStream;
    /**
     * Checks whether the stream exists (and whether the
     * user has access to it).
     */
    existsStream(name: string): Promise<boolean>;
    /**
     * Fetches a summary (name, type, description) for each requested stream name.
     * Stream names for which no managed stream exists are ignored.
     */
    getStreamSummaries(names: string[]): Promise<StreamSummary[]>;
    /**
     * Lists both managed and unmanaged streams
     */
    listStreams(): Promise<Streams.all.Definition[]>;
    listStreamsWithDataStreamExistence(): Promise<Array<{
        stream: Streams.all.Definition;
        exists: boolean;
    }>>;
    /**
     * Lists all unmanaged streams (classic streams without a
     * stored definition).
     */
    private getUnmanagedDataStreams;
    /**
     * Lists managed streams, and verifies access to it.
     */
    private getManagedStreams;
    /**
     * Deletes a stream, and its Elasticsearch objects, and its data.
     * Also verifies whether the user has access to the stream.
     */
    deleteStream(name: string): Promise<DeleteStreamResponse>;
    private updateStoredStream;
    getAncestors(name: string): Promise<Streams.WiredStream.Definition[]>;
    getDescendants(name: string): Promise<Streams.WiredStream.Definition[]>;
    private syncAssets;
}
export {};
