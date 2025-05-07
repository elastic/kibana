/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DiagnosticResult, errors } from '@elastic/elasticsearch';
import {
  IndicesDataStream,
  QueryDslQueryContainer,
  Result,
} from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient, Logger, KibanaRequest } from '@kbn/core/server';
import { isNotFoundError } from '@kbn/es-errors';
import { Condition, getAncestors, getParentId, Streams } from '@kbn/streams-schema';
import { AssetClient } from './assets/asset_client';
import { LOGS_ROOT_STREAM_NAME, rootStreamDefinition } from './root_stream_definition';
import { StreamsStorageClient } from './service';
import { checkAccess, checkAccessBulk } from './stream_crud';
import {
  DefinitionNotFoundError,
  isDefinitionNotFoundError,
} from './errors/definition_not_found_error';
import { SecurityError } from './errors/security_error';
import { State } from './state_management/state';
import { StatusError } from './errors/status_error';
import { ASSET_ID, ASSET_TYPE } from './assets/fields';

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
      scopedClusterClient: IScopedClusterClient;
      assetClient: AssetClient;
      storageClient: StreamsStorageClient;
      logger: Logger;
      request: KibanaRequest;
      isServerless: boolean;
      isDev: boolean;
    }
  ) {}

  /**
   * Streams is considered enabled when:
   * - the logs root stream exists
   * - it is a wired stream (as opposed to an ingest stream)
   */
  async isStreamsEnabled(): Promise<boolean> {
    const rootLogsStreamExists = await this.getStream(LOGS_ROOT_STREAM_NAME)
      .then((definition) => Streams.WiredStream.Definition.is(definition))
      .catch((error) => {
        if (isDefinitionNotFoundError(error)) {
          return false;
        }
        throw error;
      });

    return rootLogsStreamExists;
  }

  /**
   * Enabling streams means creating the logs root stream.
   * If it is already enabled, it is a noop.
   */
  async enableStreams(): Promise<EnableStreamsResponse> {
    const isEnabled = await this.isStreamsEnabled();

    if (isEnabled) {
      return { acknowledged: true, result: 'noop' };
    }

    const result = await State.attemptChanges(
      [
        {
          type: 'upsert',
          definition: rootStreamDefinition,
        },
      ],
      {
        ...this.dependencies,
        streamsClient: this,
      }
    );

    if (result.status === 'failed_with_rollback') {
      throw result.error;
    }

    return { acknowledged: true, result: 'created' };
  }

  /**
   * Disabling streams means deleting the logs root stream
   * AND its descendants, including any Elasticsearch objects,
   * such as data streams. That means it deletes all data
   * belonging to wired streams.
   *
   * It does NOT delete unwired streams.
   */
  async disableStreams(): Promise<DisableStreamsResponse> {
    const isEnabled = await this.isStreamsEnabled();

    if (!isEnabled) {
      return { acknowledged: true, result: 'noop' };
    }

    const result = await State.attemptChanges(
      [
        {
          type: 'delete',
          name: rootStreamDefinition.name,
        },
      ],
      {
        ...this.dependencies,
        streamsClient: this,
      }
    );

    if (result.status === 'failed_with_rollback') {
      throw result.error;
    }

    const { assetClient, storageClient } = this.dependencies;
    await Promise.all([assetClient.clean(), storageClient.clean()]);

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
    const stream: Streams.all.Definition = { ...request.stream, name };

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

    if (result.status === 'failed_with_rollback') {
      throw result.error;
    }

    const { dashboards, queries } = request;

    const queryLinks = queries.map((query) => ({
      [ASSET_ID]: query.id,
      [ASSET_TYPE]: 'query' as const,
      query,
    }));

    await this.dependencies.assetClient.syncAssetList(stream.name, [
      ...dashboards.map((dashboard) => ({
        [ASSET_ID]: dashboard,
        [ASSET_TYPE]: 'dashboard' as const,
      })),
      ...queryLinks,
    ]);

    return {
      acknowledged: true,
      result: result.changes.created.includes(name) ? 'created' : 'updated',
    };
  }

  /**
   * Forks a stream into a child with a specific condition.
   */
  async forkStream({
    parent,
    name,
    if: condition,
  }: {
    parent: string;
    name: string;
    if: Condition;
  }): Promise<ForkStreamResponse> {
    const parentDefinition = Streams.WiredStream.Definition.parse(await this.getStream(parent));

    const childExistsAlready = await this.existsStream(name);

    if (childExistsAlready) {
      throw new StatusError(`Child stream ${name} already exists`, 409);
    }

    const result = await State.attemptChanges(
      [
        {
          type: 'upsert',
          definition: {
            ...parentDefinition,
            ingest: {
              ...parentDefinition.ingest,
              wired: {
                ...parentDefinition.ingest.wired,
                routing: parentDefinition.ingest.wired.routing.concat({
                  destination: name,
                  if: condition,
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
            ingest: {
              lifecycle: { inherit: {} },
              processing: [],
              wired: {
                fields: {},
                routing: [],
              },
            },
          },
        },
      ],
      { ...this.dependencies, streamsClient: this }
    );

    if (result.status === 'failed_with_rollback') {
      throw result.error;
    }

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

  /**
   * Returns a stream definition for the given name:
   * - if a wired stream definition exists
   * - if an ingest stream definition exists
   * - if a data stream exists (creates an ingest definition on the fly)
   * - if a group stream definition exists
   *
   * Throws when:
   * - no definition is found
   * - the user does not have access to the stream
   */
  async getStream(name: string): Promise<Streams.all.Definition> {
    try {
      const response = await this.dependencies.storageClient.get({ id: name });

      const streamDefinition = response._source!;

      Streams.all.Definition.asserts(streamDefinition);

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
        const source = response._source!;
        Streams.all.Definition.asserts(source);
        return source;
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
      if (response.data_streams.length === 0) {
        throw new errors.ResponseError({
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
        });
      }

      const dataStream = response.data_streams[0];
      return dataStream;
    });
  }

  /**
   * Checks whether the user has the required privileges to manage the stream.
   * Managing a stream means updating the stream properties. It does not
   * include the dashboard links.
   */
  async getPrivileges(name: string) {
    const privileges =
      await this.dependencies.scopedClusterClient.asCurrentUser.security.hasPrivileges({
        cluster: [
          'manage_index_templates',
          'manage_ingest_pipelines',
          'manage_pipeline',
          'read_pipeline',
        ],
        index: [
          {
            names: [name],
            privileges: [
              'read',
              'write',
              'create',
              'manage',
              'monitor',
              'manage_data_stream_lifecycle',
              'manage_ilm',
            ],
          },
        ],
      });

    return {
      manage:
        Object.values(privileges.cluster).every((privilege) => privilege === true) &&
        Object.values(privileges.index[name]).every((privilege) => privilege === true),
      monitor: privileges.index[name].monitor,
      lifecycle:
        privileges.index[name].manage_data_stream_lifecycle && privileges.index[name].manage_ilm,
      simulate: privileges.cluster.read_pipeline && privileges.index[name].create,
    };
  }

  /**
   * Creates an on-the-fly ingest stream definition
   * from a concrete data stream.
   */
  private getDataStreamAsIngestStream(
    dataStream: IndicesDataStream
  ): Streams.UnwiredStream.Definition {
    const definition: Streams.UnwiredStream.Definition = {
      name: dataStream.name,
      description: '',
      ingest: {
        lifecycle: { inherit: {} },
        processing: [],
        unwired: {},
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
   * Lists all unmanaged streams (unwired streams without a
   * stored definition).
   */
  private async getUnmanagedDataStreams(): Promise<Streams.UnwiredStream.Definition[]> {
    const response = await wrapEsCall(
      this.dependencies.scopedClusterClient.asCurrentUser.indices.getDataStream()
    );

    return response.data_streams.map((dataStream) => ({
      name: dataStream.name,
      description: '',
      ingest: {
        lifecycle: { inherit: {} },
        processing: [],
        unwired: {},
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

    const streams = streamsSearchResponse.hits.hits.flatMap((hit) => {
      const source = hit._source!;
      Streams.all.Definition.asserts(source);
      return source;
    });

    const privileges = await checkAccessBulk({
      names: streams
        .filter((stream) => !Streams.GroupStream.Definition.is(stream))
        .map((stream) => stream.name),
      scopedClusterClient,
    });

    return streams.filter((stream) => {
      if (Streams.GroupStream.Definition.is(stream)) return true;
      return privileges[stream.name]?.read === true;
    });
  }

  /**
   * Deletes a stream, and its Elasticsearch objects, and its data.
   * Also verifies whether the user has access to the stream.
   */
  async deleteStream(name: string): Promise<DeleteStreamResponse> {
    const definition = await this.getStream(name);

    if (Streams.WiredStream.Definition.is(definition) && getParentId(name) === undefined) {
      throw new StatusError('Cannot delete root stream', 400);
    }

    const access =
      definition && Streams.GroupStream.Definition.is(definition)
        ? { write: true, read: true }
        : await checkAccess({
            name,
            scopedClusterClient: this.dependencies.scopedClusterClient,
          });

    // Can/should State manage access control as well?
    if (!access.write) {
      throw new SecurityError(`Cannot delete stream, insufficient privileges`);
    }

    const result = await State.attemptChanges(
      [
        {
          type: 'delete',
          name,
        },
      ],
      {
        ...this.dependencies,
        streamsClient: this,
      }
    );

    if (result.status === 'failed_with_rollback') {
      throw result.error;
    }

    await this.dependencies.assetClient.syncAssetList(definition.name, []);

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
}
