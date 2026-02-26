/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiagnosticResult } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';
import type {
  IndicesDataStream,
  IndicesGetDataStreamResponse,
  QueryDslQueryContainer,
  Result,
} from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient, KibanaRequest, Logger } from '@kbn/core/server';
import { isNotFoundError } from '@kbn/es-errors';
import type { LockManagerService } from '@kbn/lock-manager';
import type { Condition } from '@kbn/streamlang';
import type { RoutingStatus } from '@kbn/streams-schema';
import {
  LOGS_ROOT_STREAM_NAME,
  LOGS_OTEL_STREAM_NAME,
  LOGS_ECS_STREAM_NAME,
} from '@kbn/streams-schema';
import {
  Streams,
  convertUpsertRequestIntoDefinition,
  getAncestors,
  getParentId,
} from '@kbn/streams-schema';
import type { QueryClient } from './assets/query/query_client';
import type { AttachmentClient } from './attachments/attachment_client';
import {
  DefinitionNotFoundError,
  isDefinitionNotFoundError,
} from './errors/definition_not_found_error';
import { SecurityError } from './errors/security_error';
import { StatusError } from './errors/status_error';
import { StreamsStatusConflictError } from './errors/streams_status_conflict_error';
import { createRootStreamDefinition } from './root_stream_definition';
import { State } from './state_management/state';
import type { StreamsStorageClient } from './storage/streams_storage_client';
import { checkAccess, checkAccessBulk } from './stream_crud';
import type { SystemClient } from './system/system_client';
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

/*
 * When calling into Elasticsearch, the stack trace is lost.
 * If we create an error before calling, and append it to
 * any stack of the caught error, we get a more useful stack
 * trace.
 */
function wrapEsCall<T>(p: Promise<T>): Promise<T> {
  const error = new Error();
  return p.catch((caughtError) => {
    caughtError.stack += error.stack;
    throw caughtError;
  });
}

export class StreamsClient {
  constructor(
    private readonly dependencies: {
      lockManager: LockManagerService;
      scopedClusterClient: IScopedClusterClient;
      attachmentClient: AttachmentClient;
      queryClient: QueryClient;
      systemClient: SystemClient;
      featureClient: FeatureClient;
      storageClient: StreamsStorageClient;
      logger: Logger;
      request: KibanaRequest;
      isServerless: boolean;
      isDev: boolean;
    }
  ) {}

  /**
   * Streams is considered enabled when:
   * - both new streams (logs.otel and logs.ecs) are enabled
   * - it throws if any stream has a conflict
   */
  async isStreamsEnabled(): Promise<boolean> {
    const streamsStatus = await this.checkStreamStatus();

    // Check for ANY conflicts
    const hasConflict =
      streamsStatus[LOGS_ROOT_STREAM_NAME] === 'conflict' ||
      streamsStatus[LOGS_OTEL_STREAM_NAME] === 'conflict' ||
      streamsStatus[LOGS_ECS_STREAM_NAME] === 'conflict';

    if (hasConflict) {
      throw new StreamsStatusConflictError(
        'Streams status conflict: Elasticsearch and root stream status do not match, enable/disable streams again'
      );
    }

    // Enabled only when BOTH new streams are enabled
    return (
      streamsStatus[LOGS_OTEL_STREAM_NAME] === true && streamsStatus[LOGS_ECS_STREAM_NAME] === true
    );
  }

  public async checkStreamStatus(): Promise<{
    logs: boolean | 'conflict';
    [LOGS_OTEL_STREAM_NAME]: boolean | 'conflict';
    [LOGS_ECS_STREAM_NAME]: boolean | 'conflict';
  }> {
    const [kibanaStreams, esStreams] = await Promise.all([
      this.checkRootStreamsExistence(),
      this.checkElasticsearchStreamsStatus(),
    ]);

    return {
      [LOGS_ROOT_STREAM_NAME]:
        kibanaStreams[LOGS_ROOT_STREAM_NAME] !== esStreams[LOGS_ROOT_STREAM_NAME]
          ? 'conflict'
          : kibanaStreams[LOGS_ROOT_STREAM_NAME],
      [LOGS_OTEL_STREAM_NAME]:
        kibanaStreams[LOGS_OTEL_STREAM_NAME] !== esStreams[LOGS_OTEL_STREAM_NAME]
          ? 'conflict'
          : kibanaStreams[LOGS_OTEL_STREAM_NAME],
      [LOGS_ECS_STREAM_NAME]:
        kibanaStreams[LOGS_ECS_STREAM_NAME] !== esStreams[LOGS_ECS_STREAM_NAME]
          ? 'conflict'
          : kibanaStreams[LOGS_ECS_STREAM_NAME],
    };
  }

  /**
   * Checks if a specific root stream exists in Kibana storage
   */
  private async checkRootStreamExists(streamName: string): Promise<boolean> {
    return await this.getStream(streamName)
      .then((definition) => Streams.WiredStream.Definition.is(definition))
      .catch((error) => {
        if (isDefinitionNotFoundError(error)) {
          return false;
        }
        throw error;
      });
  }

  /**
   * Checks which root streams exist in Kibana storage
   * Returns: { logs: boolean, 'logs.otel': boolean, 'logs.ecs': boolean }
   */
  private async checkRootStreamsExistence(): Promise<{
    logs: boolean;
    [LOGS_OTEL_STREAM_NAME]: boolean;
    [LOGS_ECS_STREAM_NAME]: boolean;
  }> {
    const [logsExists, logsOtelExists, logsEcsExists] = await Promise.all([
      this.checkRootStreamExists(LOGS_ROOT_STREAM_NAME),
      this.checkRootStreamExists(LOGS_OTEL_STREAM_NAME),
      this.checkRootStreamExists(LOGS_ECS_STREAM_NAME),
    ]);

    return {
      logs: logsExists,
      [LOGS_OTEL_STREAM_NAME]: logsOtelExists,
      [LOGS_ECS_STREAM_NAME]: logsEcsExists,
    };
  }

  /**
   * Checks Elasticsearch enable status for all root streams
   * Returns: { logs: boolean, 'logs.otel': boolean, 'logs.ecs': boolean }
   */
  private async checkElasticsearchStreamsStatus(): Promise<{
    logs: boolean;
    [LOGS_OTEL_STREAM_NAME]: boolean;
    [LOGS_ECS_STREAM_NAME]: boolean;
  }> {
    const response = (await this.dependencies.scopedClusterClient.asInternalUser.transport.request({
      method: 'GET',
      path: '/_streams/status',
    })) as {
      logs?: { enabled: boolean };
      [LOGS_OTEL_STREAM_NAME]?: { enabled: boolean };
      [LOGS_ECS_STREAM_NAME]?: { enabled: boolean };
    };

    return {
      logs: response.logs?.enabled ?? false,
      [LOGS_OTEL_STREAM_NAME]: response[LOGS_OTEL_STREAM_NAME]?.enabled ?? false,
      [LOGS_ECS_STREAM_NAME]: response[LOGS_ECS_STREAM_NAME]?.enabled ?? false,
    };
  }

  /**
   * Enabling streams means creating the necessary root streams.
   * For fresh installs: creates logs.otel and logs.ecs
   * For existing users: keeps logs, adds logs.otel and logs.ecs
   *
   * If all required streams are already enabled, it is a noop.
   */
  async enableStreams(): Promise<EnableStreamsResponse> {
    // Step 1: Check current state
    const [kibanaStreams, esStreams] = await Promise.all([
      this.checkRootStreamsExistence(),
      this.checkElasticsearchStreamsStatus(),
    ]);

    // Step 2: Determine which streams to create/enable
    const streamsToCreate: string[] = [];
    const streamsToEnableInES: string[] = [];

    // Legacy stream conflict handling
    if (!kibanaStreams.logs && esStreams.logs) {
      streamsToCreate.push(LOGS_ROOT_STREAM_NAME);
    }
    if (kibanaStreams.logs && !esStreams.logs) {
      streamsToEnableInES.push(LOGS_ROOT_STREAM_NAME);
    }

    if (!kibanaStreams[LOGS_OTEL_STREAM_NAME]) {
      streamsToCreate.push(LOGS_OTEL_STREAM_NAME);
    }
    if (!kibanaStreams[LOGS_ECS_STREAM_NAME]) {
      streamsToCreate.push(LOGS_ECS_STREAM_NAME);
    }

    if (!esStreams[LOGS_OTEL_STREAM_NAME]) {
      streamsToEnableInES.push(LOGS_OTEL_STREAM_NAME);
    }
    if (!esStreams[LOGS_ECS_STREAM_NAME]) {
      streamsToEnableInES.push(LOGS_ECS_STREAM_NAME);
    }

    // Step 3: Check if this is a noop
    if (streamsToCreate.length === 0 && streamsToEnableInES.length === 0) {
      return { acknowledged: true, result: 'noop' };
    }

    // Step 4: Create Kibana definitions for missing streams
    if (streamsToCreate.length > 0) {
      await State.attemptChanges(
        streamsToCreate.map((streamName) => ({
          type: 'upsert',
          definition: createRootStreamDefinition(streamName),
        })),
        {
          ...this.dependencies,
          streamsClient: this,
        }
      );
    }

    // Step 5: Enable streams in Elasticsearch (parallel calls)
    if (streamsToEnableInES.length > 0) {
      await Promise.all(
        streamsToEnableInES.map((streamName) =>
          this.dependencies.scopedClusterClient.asCurrentUser.transport.request({
            method: 'POST',
            path: `_streams/${streamName}/_enable`,
          })
        )
      );
    }

    return { acknowledged: true, result: 'created' };
  }

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
  async disableStreams(): Promise<DisableStreamsResponse> {
    // Get current state
    const [kibanaStreams, esStreams] = await Promise.all([
      this.checkRootStreamsExistence(),
      this.checkElasticsearchStreamsStatus(),
    ]);

    const streamsToDelete: string[] = [];
    const streamsToDisableInES: string[] = [];

    // Determine which streams to delete/disable
    if (kibanaStreams.logs) streamsToDelete.push(LOGS_ROOT_STREAM_NAME);
    if (kibanaStreams[LOGS_OTEL_STREAM_NAME]) streamsToDelete.push(LOGS_OTEL_STREAM_NAME);
    if (kibanaStreams[LOGS_ECS_STREAM_NAME]) streamsToDelete.push(LOGS_ECS_STREAM_NAME);

    if (esStreams.logs) streamsToDisableInES.push(LOGS_ROOT_STREAM_NAME);
    if (esStreams[LOGS_OTEL_STREAM_NAME]) streamsToDisableInES.push(LOGS_OTEL_STREAM_NAME);
    if (esStreams[LOGS_ECS_STREAM_NAME]) streamsToDisableInES.push(LOGS_ECS_STREAM_NAME);

    // Check if this is a noop
    if (streamsToDelete.length === 0 && streamsToDisableInES.length === 0) {
      return { acknowledged: true, result: 'noop' };
    }

    // Delete Kibana definitions
    if (streamsToDelete.length > 0) {
      await State.attemptChanges(
        streamsToDelete.map((name) => ({ type: 'delete' as const, name })),
        {
          ...this.dependencies,
          streamsClient: this,
        }
      );

      const { attachmentClient, queryClient, storageClient } = this.dependencies;
      await Promise.all([queryClient.clean(), attachmentClient.clean(), storageClient.clean()]);
    }

    // Disable in Elasticsearch (parallel calls)
    if (streamsToDisableInES.length > 0) {
      await Promise.all(
        streamsToDisableInES.map((streamName) =>
          this.dependencies.scopedClusterClient.asCurrentUser.transport.request({
            method: 'POST',
            path: `_streams/${streamName}/_disable`,
          })
        )
      );
    }

    return { acknowledged: true, result: 'deleted' };
  }

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
  async resyncStreams(): Promise<ResyncStreamsResponse> {
    await State.resync({
      ...this.dependencies,
      streamsClient: this,
    });

    return { acknowledged: true, result: 'updated' };
  }

  /**
   * Creates or updates a stream. The routing of the parent is
   * also updated (including syncing to Elasticsearch).
   */
  async upsertStream({
    name,
    request,
  }: {
    name: string;
    request: Streams.all.UpsertRequest;
  }): Promise<UpsertStreamResponse> {
    const stream = convertUpsertRequestIntoDefinition(name, request);

    const result = await State.attemptChanges(
      [
        {
          type: 'upsert',
          definition: stream,
        },
      ],
      {
        ...this.dependencies,
        streamsClient: this,
      }
    );

    await this.syncAssets(stream, request);

    return {
      acknowledged: true,
      result: result.changes.created.includes(name) ? 'created' : 'updated',
    };
  }

  async bulkUpsert(streams: Array<{ name: string; request: Streams.all.UpsertRequest }>) {
    const definitions = streams.map(({ name, request }) => {
      return { request, definition: convertUpsertRequestIntoDefinition(name, request) };
    });

    const result = await State.attemptChanges(
      definitions.map(({ definition }) => ({
        type: 'upsert',
        definition,
      })),
      {
        ...this.dependencies,
        streamsClient: this,
      }
    );

    await Promise.all(
      definitions.map(({ definition, request }) => this.syncAssets(definition, request))
    );

    return {
      acknowledged: true,
      result: { created: result.changes.created, updated: result.changes.updated },
    };
  }

  /**
   * Forks a stream into a child with a specific condition.
   */
  async forkStream({
    parent,
    name,
    where: condition,
    status,
  }: {
    parent: string;
    name: string;
    where: Condition;
    status: RoutingStatus;
  }): Promise<ForkStreamResponse> {
    const parentDefinition = Streams.WiredStream.Definition.parse(await this.getStream(parent));

    const childExistsAlready = await this.existsStream(name);

    if (childExistsAlready) {
      throw new StatusError(`Child stream ${name} already exists`, 409);
    }

    const now = new Date().toISOString();
    await State.attemptChanges(
      [
        {
          type: 'upsert',
          definition: {
            ...parentDefinition,
            updated_at: now,
            ingest: {
              ...parentDefinition.ingest,
              wired: {
                ...parentDefinition.ingest.wired,
                routing: parentDefinition.ingest.wired.routing.concat({
                  destination: name,
                  where: condition,
                  status,
                }),
              },
            },
          },
        },
        {
          type: 'upsert',
          definition: {
            name,
            description: '',
            updated_at: now,
            query_streams: [],
            ingest: {
              lifecycle: { inherit: {} },
              processing: { steps: [], updated_at: now },
              settings: {},
              wired: {
                fields: {},
                routing: [],
              },
              failure_store: { inherit: {} },
            },
          },
        },
      ],
      { ...this.dependencies, streamsClient: this }
    );

    return { acknowledged: true, result: 'created' };
  }

  async createQueryStream({
    name,
    query,
  }: {
    name: string;
    query: Streams.QueryStream.UpsertRequest['stream']['query'];
  }): Promise<UpsertStreamResponse> {
    await State.attemptChanges(
      [
        {
          type: 'upsert',
          definition: {
            name,
            description: '',
            updated_at: new Date().toISOString(),
            query_streams: [],
            query,
          },
        },
      ],
      { ...this.dependencies, streamsClient: this }
    );

    return { acknowledged: true, result: 'created' };
  }

  /**
   * Make sure there is a stream definition for a given stream.
   * If the data stream exists but the stream definition does not, it creates an empty stream definition.
   * If the stream definition exists, it is a noop.
   * If the data stream does not exist or the user does not have access, it throws.
   */
  async ensureStream(name: string): Promise<void> {
    const [streamDefinition, dataStream] = await Promise.all([
      this.getStoredStreamDefinition(name).catch((error) => {
        if (isNotFoundError(error)) {
          return error;
        }
        throw error;
      }),
      this.getDataStream(name).catch((error) => {
        if (isNotFoundError(error)) {
          return error;
        }
        throw error;
      }),
    ]);
    if (!isNotFoundError(streamDefinition)) {
      // stream definitely exists, all good
      return;
    }
    if (!isNotFoundError(dataStream) && isNotFoundError(streamDefinition)) {
      // stream definition does not exist, but data stream does - create an empty stream definition
      await this.updateStoredStream(this.getDataStreamAsIngestStream(dataStream));
      return;
    }
    // if both do not exist, the stream does not exist, so this should be a 404
    throw streamDefinition;
  }

  private getStreamDefinitionFromSource(source: Streams.all.Definition | undefined) {
    if (!source) {
      throw new DefinitionNotFoundError(`Cannot find stream definition`);
    }
    return source;
  }

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
  async getStream(name: string): Promise<Streams.all.Definition> {
    try {
      const response = await this.dependencies.storageClient.get({ id: name });

      const streamDefinition = this.getStreamDefinitionFromSource(response._source);

      if (Streams.ingest.all.Definition.is(streamDefinition)) {
        const privileges = await checkAccess({
          name,
          scopedClusterClient: this.dependencies.scopedClusterClient,
        });
        if (!privileges.read) {
          throw new SecurityError(`Cannot read stream, insufficient privileges`);
        }
      }
      return streamDefinition;
    } catch (error) {
      try {
        if (isNotFoundError(error)) {
          const dataStream = await this.getDataStream(name);
          return this.getDataStreamAsIngestStream(dataStream);
        }
        throw error;
      } catch (e) {
        if (isNotFoundError(e)) {
          throw new DefinitionNotFoundError(`Cannot find stream ${name}`);
        }
        throw e;
      }
    }
  }

  private async getStoredStreamDefinition(name: string): Promise<Streams.all.Definition> {
    return await Promise.all([
      this.dependencies.storageClient.get({ id: name }).then((response) => {
        return this.getStreamDefinitionFromSource(response._source);
      }),
      checkAccess({ name, scopedClusterClient: this.dependencies.scopedClusterClient }).then(
        (privileges) => {
          if (!privileges.read) {
            throw new SecurityError(`Cannot read stream, insufficient privileges`);
          }
        }
      ),
    ]).then(([wiredDefinition]) => {
      return wiredDefinition;
    });
  }

  async getDataStream(name: string): Promise<IndicesDataStream> {
    return wrapEsCall(
      this.dependencies.scopedClusterClient.asCurrentUser.indices.getDataStream({ name })
    ).then((response) => {
      const notFoundErrorBody = {
        meta: {
          aborted: false,
          attempts: 1,
          connection: null,
          context: null,
          name: 'resource_not_found_exception',
          request: {} as unknown as DiagnosticResult['meta']['request'],
        },
        warnings: [],
        body: 'resource_not_found_exception',
        statusCode: 404,
      };
      if (response.data_streams.length === 0) {
        throw new errors.ResponseError(notFoundErrorBody);
      }

      const dataStream = response.data_streams[0];
      if (!dataStream) {
        throw new errors.ResponseError(notFoundErrorBody);
      }
      return dataStream;
    });
  }

  /**
   * Checks whether the user has the required privileges to manage the stream (or streams).
   * Managing a stream means updating the stream properties. It does not
   * include the dashboard links.
   *
   * In case multiple streams are provided, it checks whether the user has
   * the required privileges on all streams, and returns the least-privileged
   * result.
   */
  async getPrivileges(nameOrNames: string | string[]) {
    const names = Array.isArray(nameOrNames) ? nameOrNames : [nameOrNames];
    const isServerless = this.dependencies.isServerless;
    const REQUIRED_MANAGE_PRIVILEGES = [
      'manage_index_templates',
      'manage_ingest_pipelines',
      'manage_pipeline',
      'read_pipeline',
    ];

    if (!isServerless) {
      REQUIRED_MANAGE_PRIVILEGES.push('monitor_text_structure');
    }

    const CREATE_SNAPSHOT_REPOSITORY_CLUSTER_PRIVILEGE = 'cluster:admin/repository/put';

    const REQUIRED_INDEX_PRIVILEGES = [
      'read',
      'write',
      'create',
      'manage',
      'monitor',
      'view_index_metadata',
      'manage_data_stream_lifecycle',
      'read_failure_store',
      'manage_failure_store',
    ];
    if (!isServerless) {
      REQUIRED_INDEX_PRIVILEGES.push('manage_ilm');
    }

    const privileges =
      await this.dependencies.scopedClusterClient.asCurrentUser.security.hasPrivileges({
        cluster: [...REQUIRED_MANAGE_PRIVILEGES, CREATE_SNAPSHOT_REPOSITORY_CLUSTER_PRIVILEGE],
        index: [
          {
            names,
            privileges: REQUIRED_INDEX_PRIVILEGES,
          },
        ],
      });

    return {
      manage:
        REQUIRED_MANAGE_PRIVILEGES.every((privilege) => privileges.cluster[privilege] === true) &&
        names.every((name) =>
          Object.values(privileges.index[name]).every((privilege) => privilege === true)
        ),
      monitor: names.every((name) => privileges.index[name].monitor),
      view_index_metadata: names.every((name) => privileges.index[name].view_index_metadata),
      // on serverless, there is no ILM, so we map lifecycle to true if the user has manage_data_stream_lifecycle
      lifecycle: isServerless
        ? names.every((name) => privileges.index[name].manage_data_stream_lifecycle)
        : names.every(
            (name) =>
              privileges.index[name].manage_data_stream_lifecycle &&
              privileges.index[name].manage_ilm
          ),
      simulate:
        privileges.cluster.read_pipeline && names.every((name) => privileges.index[name].create),
      // text structure is always available for the internal user, but not for the current user
      text_structure: isServerless ? true : privileges.cluster.monitor_text_structure,
      read_failure_store: names.every((name) => privileges.index[name].read_failure_store),
      manage_failure_store: names.every((name) => privileges.index[name].manage_failure_store),
      create_snapshot_repository:
        privileges.cluster[CREATE_SNAPSHOT_REPOSITORY_CLUSTER_PRIVILEGE] === true,
    };
  }

  /**
   * Creates an on-the-fly ingest stream definition
   * from a concrete data stream.
   */
  private getDataStreamAsIngestStream(
    dataStream: IndicesDataStream
  ): Streams.ClassicStream.Definition {
    const timestamp = new Date(0).toISOString();

    const definition: Streams.ClassicStream.Definition = {
      name: dataStream.name,
      description: '',
      updated_at: timestamp,
      ingest: {
        lifecycle: { inherit: {} },
        processing: { steps: [], updated_at: timestamp },
        settings: {},
        classic: {},
        failure_store: { inherit: {} },
      },
    };

    return definition;
  }

  /**
   * Checks whether the stream exists (and whether the
   * user has access to it).
   */
  async existsStream(name: string): Promise<boolean> {
    const exists = await this.getStream(name)
      .then(() => true)
      .catch((error) => {
        if (isDefinitionNotFoundError(error)) {
          return false;
        }
        throw error;
      });

    return exists;
  }

  /**
   * Lists both managed and unmanaged streams
   */
  async listStreams(): Promise<Streams.all.Definition[]> {
    const streams = await this.listStreamsWithDataStreamExistence();
    return streams.map(({ stream }) => {
      return stream;
    });
  }

  async listStreamsWithDataStreamExistence(): Promise<
    Array<{ stream: Streams.all.Definition; exists: boolean }>
  > {
    const [managedStreams, unmanagedStreams] = await Promise.all([
      this.getManagedStreams(),
      this.getUnmanagedDataStreams(),
    ]);

    const allDefinitionsById = new Map<string, { stream: Streams.all.Definition; exists: boolean }>(
      managedStreams.map((stream) => [stream.name, { stream, exists: false }])
    );

    unmanagedStreams.forEach((stream) => {
      if (!allDefinitionsById.get(stream.name)) {
        allDefinitionsById.set(stream.name, { stream, exists: true });
      } else {
        allDefinitionsById.set(stream.name, {
          ...allDefinitionsById.get(stream.name)!,
          exists: true,
        });
      }
    });

    return Array.from(allDefinitionsById.values());
  }

  /**
   * Lists all unmanaged streams (classic streams without a
   * stored definition).
   */
  private async getUnmanagedDataStreams(): Promise<Streams.ClassicStream.Definition[]> {
    let response: IndicesGetDataStreamResponse;
    try {
      response = await wrapEsCall(
        this.dependencies.scopedClusterClient.asCurrentUser.indices.getDataStream()
      );
    } catch (e) {
      // if permissions are insufficient, we just return an empty list
      if (e instanceof Error && 'statusCode' in e && e.statusCode === 403) {
        return [];
      }
      throw e;
    }

    const now = new Date().toISOString();

    return response.data_streams.map((dataStream) => ({
      name: dataStream.name,
      description: '',
      updated_at: now,
      ingest: {
        lifecycle: { inherit: {} },
        processing: { steps: [], updated_at: now },
        settings: {},
        classic: {},
        failure_store: { inherit: {} },
      },
    }));
  }

  /**
   * Lists managed streams, and verifies access to it.
   */
  private async getManagedStreams({ query }: { query?: QueryDslQueryContainer } = {}): Promise<
    Streams.all.Definition[]
  > {
    const { scopedClusterClient, storageClient } = this.dependencies;

    const streamsSearchResponse = await storageClient.search({
      size: 10000,
      sort: [{ name: 'asc' }],
      track_total_hits: false,
      query,
    });

    const streams = streamsSearchResponse.hits.hits
      .filter(
        ({ _source: definition }) => !('group' in definition) // Filter out old Group streams
      )
      .flatMap((hit) => this.getStreamDefinitionFromSource(hit._source));

    const privileges = await checkAccessBulk({
      names: streams
        .filter((stream) => !Streams.QueryStream.Definition.is(stream))
        .map((stream) => stream.name),
      scopedClusterClient,
    });

    return streams.filter((stream) => {
      if (Streams.QueryStream.Definition.is(stream)) return true;
      return privileges[stream.name]?.read === true;
    });
  }

  /**
   * Deletes a stream, and its Elasticsearch objects, and its data.
   * Also verifies whether the user has access to the stream.
   */
  async deleteStream(name: string): Promise<DeleteStreamResponse> {
    const definition = await this.getStream(name);

    if (Streams.ClassicStream.Definition.is(definition)) {
      // attempting to delete a classic stream that was not previously stored
      // results in a noop so we make sure to make it available in the state first
      await this.ensureStream(name);
    }

    const isRootStream =
      Streams.WiredStream.Definition.is(definition) && getParentId(name) === undefined;

    if (isRootStream) {
      // Only allow deletion of the legacy 'logs' root stream
      // logs.otel and logs.ecs remain protected
      if (name !== LOGS_ROOT_STREAM_NAME) {
        throw new StatusError('Cannot delete root stream', 400);
      }
    }

    // Delete from Kibana
    await State.attemptChanges([{ type: 'delete', name }], {
      ...this.dependencies,
      streamsClient: this,
    });

    // For root streams, also disable in Elasticsearch
    if (isRootStream) {
      try {
        await this.dependencies.scopedClusterClient.asCurrentUser.transport.request({
          method: 'POST',
          path: `_streams/${name}/_disable`,
        });
      } catch (error) {
        // Log but don't fail - stream might not exist in ES or already be disabled
        this.dependencies.logger.warn(
          `Failed to disable stream ${name} in Elasticsearch after deletion: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    return { acknowledged: true, result: 'deleted' };
  }

  private async updateStoredStream(definition: Streams.all.Definition) {
    return this.dependencies.storageClient.index({
      id: definition.name,
      document: definition,
    });
  }

  async getAncestors(name: string): Promise<Streams.WiredStream.Definition[]> {
    const ancestorIds = getAncestors(name);

    return this.getManagedStreams({
      query: {
        bool: {
          filter: [{ terms: { name: ancestorIds } }],
        },
      },
    }).then((streams) => streams.filter(Streams.WiredStream.Definition.is));
  }

  async getDescendants(name: string): Promise<Streams.WiredStream.Definition[]> {
    return this.getManagedStreams({
      query: {
        bool: {
          filter: [
            {
              prefix: {
                name,
              },
            },
          ],
          must_not: [
            {
              term: {
                name,
              },
            },
          ],
        },
      },
    }).then((streams) => streams.filter(Streams.WiredStream.Definition.is));
  }

  private async syncAssets(definition: Streams.all.Definition, request: Streams.all.UpsertRequest) {
    const { dashboards, queries, rules } = request;

    await Promise.all([
      this.dependencies.attachmentClient.syncAttachmentList(
        definition.name,
        dashboards.map((dashboard) => ({
          id: dashboard,
          type: 'dashboard' as const,
        })),
        'dashboard'
      ),
      this.dependencies.attachmentClient.syncAttachmentList(
        definition.name,
        rules.map((rule) => ({
          id: rule,
          type: 'rule' as const,
        })),
        'rule'
      ),
      this.dependencies.queryClient.syncQueries(definition, queries),
    ]);
  }
}
