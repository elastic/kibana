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
  StreamDefinition,
  StreamUpsertRequest,
  UnwiredStreamDefinition,
  WiredStreamDefinition,
  assertsSchema,
  getAncestors,
  isGroupStreamDefinition,
  isIngestStreamDefinition,
  isUnwiredStreamDefinition,
  isWiredStreamDefinition,
  streamDefinitionSchema,
  asWiredStreamDefinition,
} from '@kbn/streams-schema';
import { orderBy } from 'lodash';
import { AssetClient } from './assets/asset_client';
import { ForbiddenMemberTypeError } from './errors/forbidden_member_type_error';
import { LOGS_ROOT_STREAM_NAME, rootStreamDefinition } from './root_stream_definition';
import { StreamsStorageClient } from './service';
import { checkAccess, checkAccessBulk } from './stream_crud';
import {
  DefinitionNotFoundError,
  isDefinitionNotFoundError,
} from './errors/definition_not_found_error';
import { State } from './state_management/state';

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
export type UpsertStreamResponse = AcknowledgeResponse<'updated'>;

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

    await State.attemptChanges(
      [
        {
          target: rootStreamDefinition.name,
          type: 'wired_upsert',
          request: {
            dashboards: [],
            stream: rootStreamDefinition,
          },
        },
      ],
      this.stateDependencies
    );

    return { acknowledged: true, result: 'created' };
  }

  private get stateDependencies() {
    return {
      ...this.dependencies,
      streamsClient: this,
    };
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

    await State.attemptChanges(
      [
        {
          type: 'delete',
          target: LOGS_ROOT_STREAM_NAME,
        },
      ],
      this.stateDependencies
    );

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
    const streams = await this.getManagedStreams();

    const streamsWithDepth = streams.map((stream) => ({
      stream,
      depth: stream.name.match(/\./g)?.length ?? 0,
    }));

    const streamsInOrder = orderBy(streamsWithDepth, 'depth', 'desc');

    for (const { stream } of streamsInOrder) {
      // TODO: do this via attemptChanges
      // await this.syncStreamObjects({
      //   definition: stream,
      // });
    }
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
    const { dashboards } = request;

    if (isWiredStreamDefinition(stream)) {
      await State.attemptChanges(
        [
          {
            target: name,
            type: 'wired_upsert',
            request: {
              dashboards,
              stream,
            },
          },
        ],
        this.stateDependencies
      );
    } else if (isUnwiredStreamDefinition(stream)) {
      await State.attemptChanges(
        [
          {
            target: name,
            type: 'unwired_upsert',
            request: {
              dashboards,
              stream,
            },
          },
        ],
        this.stateDependencies
      );
    } else {
      throw new Error('TODO implement this for group streams');
    }
    return { acknowledged: true, result: 'updated' };
  }
  /**
   * Validates the members of the group streams to ensure they are NOT
   * GroupStreamDefinitions
   */
  async assertValidGroupMembers({ definition }: { definition: GroupStreamDefinition }) {
    const { members } = definition.group;

    if (members.includes(definition.name)) {
      throw new ForbiddenMemberTypeError('Group streams can not include themselves as a member');
    }

    await Promise.all(
      members.map(async (name) => {
        const memberStream = await this.getStream(name);
        if (isGroupStreamDefinition(memberStream)) {
          throw new ForbiddenMemberTypeError(
            `Group streams can not be a member of a group, please remove [${name}]`
          );
        }
      })
    );
  }

  /**
   * Forks a stream into a child with a specific condition.
   * It mostly defers to `upsertStream` for its validations,
   * except for two things:
   * - it makes sure the name is valid for a child of the
   * forked stream
   * - the child does not already exist
   *
   * Additionally, it adds the specified condition to the
   * forked stream (which cannot happen via a PUT of the
   * child stream).
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

    const childDefinition: WiredStreamDefinition = {
      name,
      ingest: { lifecycle: { inherit: {} }, processing: [], routing: [], wired: { fields: {} } },
    };

    // rewrite work as update of parent routing and upsert of child
    await State.attemptChanges(
      [
        {
          target: parentDefinition.name,
          type: 'wired_upsert',
          request: {
            // todo add dashboards
            dashboards: [],
            stream: {
              ...parentDefinition,
              ingest: {
                ...parentDefinition.ingest,
                routing: parentDefinition.ingest.routing.concat({
                  destination: name,
                  if: condition,
                }),
              },
            },
          },
        },
        {
          target: name,
          type: 'wired_upsert',
          request: {
            dashboards: [],
            stream: childDefinition,
          },
        },
      ],
      this.stateDependencies
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
          return undefined;
        }
        throw error;
      }),
      this.getDataStream(name),
    ]);
    if (dataStream && !streamDefinition) {
      await this.updateStoredStream(this.getDataStreamAsIngestStream(dataStream));
    }
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
        routing: [],
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
        routing: [],
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
    await State.attemptChanges(
      [
        {
          type: 'delete',
          target: name,
        },
      ],
      this.stateDependencies
    );

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
