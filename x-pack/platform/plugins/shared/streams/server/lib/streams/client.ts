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
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { isNotFoundError } from '@kbn/es-errors';
import {
  Condition,
  GroupStreamDefinition,
  IngestStreamLifecycle,
  StreamDefinition,
  StreamUpsertRequest,
  UnwiredStreamDefinition,
  WiredStreamDefinition,
  assertsSchema,
  getAncestors,
  getParentId,
  isChildOf,
  isGroupStreamDefinition,
  isIngestStreamDefinition,
  isDslLifecycle,
  isIlmLifecycle,
  isInheritLifecycle,
  isRootStreamDefinition,
  isUnwiredStreamDefinition,
  isWiredStreamDefinition,
  streamDefinitionSchema,
  findInheritedLifecycle,
  findInheritingStreams,
  asWiredStreamDefinition,
} from '@kbn/streams-schema';
import { cloneDeep, keyBy } from 'lodash';
import { AssetClient } from './assets/asset_client';
import { ForbiddenMemberTypeError } from './errors/forbidden_member_type_error';
import {
  syncUnwiredStreamDefinitionObjects,
  syncWiredStreamDefinitionObjects,
} from './helpers/sync';
import {
  validateAncestorFields,
  validateDescendantFields,
  validateSystemFields,
} from './helpers/validate_fields';
import {
  validateRootStreamChanges,
  validateStreamChildrenChanges,
  validateStreamLifecycle,
  validateStreamTypeChanges,
} from './helpers/validate_stream';
import { LOGS_ROOT_STREAM_NAME, rootStreamDefinition } from './root_stream_definition';
import { StreamsStorageClient } from './service';
import {
  checkAccess,
  checkAccessBulk,
  deleteStreamObjects,
  deleteUnmanagedStreamObjects,
  getDataStreamLifecycle,
} from './stream_crud';
import { updateDataStreamsLifecycle } from './data_streams/manage_data_streams';
import {
  DefinitionNotFoundError,
  isDefinitionNotFoundError,
} from './errors/definition_not_found_error';
import { MalformedStreamIdError } from './errors/malformed_stream_id_error';
import { SecurityError } from './errors/security_error';
import { NameTakenError } from './errors/name_taken_error';
import { MalformedStreamError } from './errors/malformed_stream_error';
import { State } from './state_management/state';
import { StatusError } from './errors/status_error';

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

export class StreamsClient {
  constructor(
    private readonly dependencies: {
      scopedClusterClient: IScopedClusterClient;
      assetClient: AssetClient;
      storageClient: StreamsStorageClient;
      logger: Logger;
      isServerless: boolean;
    }
  ) {}

  /**
   * Streams is considered enabled when:
   * - the logs root stream exists
   * - it is a wired stream (as opposed to an ingest stream)
   */
  async isStreamsEnabled(): Promise<boolean> {
    const rootLogsStreamExists = await this.getStream(LOGS_ROOT_STREAM_NAME)
      .then((definition) => isWiredStreamDefinition(definition))
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
   * It does NOT delete ingest streams.
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
    request: StreamUpsertRequest;
  }): Promise<UpsertStreamResponse> {
    const stream: StreamDefinition = { ...request.stream, name };

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

    const { dashboards } = request;
    await this.dependencies.assetClient.syncAssetList({
      entityId: stream.name,
      entityType: 'stream',
      assetIds: dashboards,
      assetType: 'dashboard',
    });

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
    const parentDefinition = asWiredStreamDefinition(await this.getStream(parent));

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
            ingest: {
              lifecycle: { inherit: {} },
              processing: [],
              wired: { fields: {}, routing: [] },
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
  async getStream(name: string): Promise<StreamDefinition> {
    try {
      const response = await this.dependencies.storageClient.get({ id: name });

      const streamDefinition = response._source;
      assertsSchema(streamDefinitionSchema, streamDefinition);

      if (isIngestStreamDefinition(streamDefinition)) {
        const privileges = await checkAccess({
          name,
          scopedClusterClient: this.dependencies.scopedClusterClient,
        });
        if (!privileges.read) {
          throw new DefinitionNotFoundError(`Stream definition for ${name} not found`);
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

  private async getStoredStreamDefinition(name: string): Promise<StreamDefinition> {
    return await Promise.all([
      this.dependencies.storageClient.get({ id: name }).then((response) => {
        const source = response._source;
        assertsSchema(streamDefinitionSchema, source);
        return source;
      }),
      checkAccess({ name, scopedClusterClient: this.dependencies.scopedClusterClient }).then(
        (privileges) => {
          if (!privileges.read) {
            throw new DefinitionNotFoundError(`Stream definition for ${name} not found`);
          }
        }
      ),
    ]).then(([wiredDefinition]) => {
      return wiredDefinition;
    });
  }

  async getDataStream(name: string): Promise<IndicesDataStream> {
    return this.dependencies.scopedClusterClient.asCurrentUser.indices
      .getDataStream({ name })
      .then((response) => {
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
   * Creates an on-the-fly ingest stream definition
   * from a concrete data stream.
   */
  private getDataStreamAsIngestStream(dataStream: IndicesDataStream): UnwiredStreamDefinition {
    const definition: UnwiredStreamDefinition = {
      name: dataStream.name,
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
  async listStreams(): Promise<StreamDefinition[]> {
    const [managedStreams, unmanagedStreams] = await Promise.all([
      this.getManagedStreams(),
      this.getUnmanagedDataStreams(),
    ]);

    const allDefinitionsById = new Map<string, StreamDefinition>(
      managedStreams.map((stream) => [stream.name, stream])
    );

    unmanagedStreams.forEach((stream) => {
      if (!allDefinitionsById.get(stream.name)) {
        allDefinitionsById.set(stream.name, stream);
      }
    });

    return Array.from(allDefinitionsById.values());
  }

  /**
   * Lists all unmanaged streams (unwired streams without a
   * stored definition).
   */
  private async getUnmanagedDataStreams(): Promise<UnwiredStreamDefinition[]> {
    const response =
      await this.dependencies.scopedClusterClient.asCurrentUser.indices.getDataStream();

    return response.data_streams.map((dataStream) => ({
      name: dataStream.name,
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
    StreamDefinition[]
  > {
    const { scopedClusterClient, storageClient } = this.dependencies;

    const streamsSearchResponse = await storageClient.search({
      size: 10000,
      sort: [{ name: 'asc' }],
      track_total_hits: false,
      query,
    });

    const streams = streamsSearchResponse.hits.hits.flatMap((hit) => {
      const source = hit._source;
      assertsSchema(streamDefinitionSchema, source);
      return source;
    });

    const privileges = await checkAccessBulk({
      names: streams
        .filter((stream) => !isGroupStreamDefinition(stream))
        .map((stream) => stream.name),
      scopedClusterClient,
    });

    return streams.filter((stream) => {
      if (isGroupStreamDefinition(stream)) return true;
      return privileges[stream.name]?.read === true;
    });
  }

  /**
   * Deletes a stream, and its Elasticsearch objects, and its data.
   * Also verifies whether the user has access to the stream.
   */
  async deleteStream(name: string): Promise<DeleteStreamResponse> {
    const definition = await this.getStream(name);

    if (isWiredStreamDefinition(definition) && getParentId(name) === undefined) {
      throw new StatusError('Cannot delete root stream', 400);
    }

    const access =
      definition && isGroupStreamDefinition(definition)
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

    return { acknowledged: true, result: 'deleted' };
  }

  private async updateStoredStream(definition: StreamDefinition) {
    return this.dependencies.storageClient.index({
      id: definition.name,
      document: definition,
    });
  }

  async getAncestors(name: string): Promise<WiredStreamDefinition[]> {
    const ancestorIds = getAncestors(name);

    return this.getManagedStreams({
      query: {
        bool: {
          filter: [{ terms: { name: ancestorIds } }],
        },
      },
    }).then((streams) => streams.filter(isWiredStreamDefinition));
  }

  async getDescendants(name: string): Promise<WiredStreamDefinition[]> {
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
    }).then((streams) => streams.filter(isWiredStreamDefinition));
  }
}
