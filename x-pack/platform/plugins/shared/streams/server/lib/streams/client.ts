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
import { isResponseError } from '@kbn/es-errors';
import {
  Condition,
  GroupStreamDefinition,
  IngestStreamLifecycle,
  StreamDefinition,
  StreamUpsertRequest,
  UnwiredStreamDefinition,
  WiredStreamDefinition,
  asIngestStreamDefinition,
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
} from '@kbn/streams-schema';
import { cloneDeep, keyBy, omit, orderBy } from 'lodash';
import { AssetClient } from './assets/asset_client';
import { ForbiddenMemberTypeError } from './errors/forbidden_member_type_error';
import {
  syncUnwiredStreamDefinitionObjects,
  syncWiredStreamDefinitionObjects,
} from './helpers/sync';
import { validateAncestorFields, validateDescendantFields } from './helpers/validate_fields';
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
import { DefinitionNotFoundError } from './errors/definition_not_found_error';
import { MalformedStreamIdError } from './errors/malformed_stream_id_error';
import { SecurityError } from './errors/security_error';
import { NameTakenError } from './errors/name_taken_error';
import { MalformedStreamError } from './errors/malformed_stream_error';

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

function isElasticsearch404(error: unknown): error is errors.ResponseError & { statusCode: 404 } {
  return isResponseError(error) && error.statusCode === 404;
}

function isDefinitionNotFoundError(error: unknown): error is DefinitionNotFoundError {
  return error instanceof DefinitionNotFoundError;
}

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

    await this.upsertStream({
      request: {
        dashboards: [],
        stream: omit(rootStreamDefinition, 'name'),
      },
      name: rootStreamDefinition.name,
    });

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

    const definition = await this.getStream(LOGS_ROOT_STREAM_NAME);

    await this.deleteStreamFromDefinition(definition);

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
      await this.syncStreamObjects({
        definition: stream,
      });
    }
    return { acknowledged: true, result: 'updated' };
  }

  private async syncStreamObjects({ definition }: { definition: StreamDefinition }) {
    const { logger, scopedClusterClient } = this.dependencies;

    if (isWiredStreamDefinition(definition)) {
      await syncWiredStreamDefinitionObjects({
        definition,
        logger,
        scopedClusterClient,
        isServerless: this.dependencies.isServerless,
      });

      const effectiveLifecycle = findInheritedLifecycle(
        definition,
        isInheritLifecycle(definition.ingest.lifecycle)
          ? await this.getAncestors(definition.name)
          : []
      );
      await this.updateStreamLifecycle(definition, effectiveLifecycle);
    } else if (isUnwiredStreamDefinition(definition)) {
      await syncUnwiredStreamDefinitionObjects({
        definition,
        scopedClusterClient,
        logger,
        dataStream: await this.getDataStream(definition.name),
      });

      // inherit lifecycle is a noop for unwired streams, it keeps the
      // data stream configuration as-is
      if (isDslLifecycle(definition.ingest.lifecycle)) {
        await this.updateStreamLifecycle(definition, definition.ingest.lifecycle);
      }
    }
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
    const { result, parentDefinition } = await this.validateAndUpsertStream({
      definition: stream,
    });

    if (parentDefinition) {
      const isRoutingToChild = parentDefinition.ingest.routing.find(
        (item) => item.destination === name
      );

      if (!isRoutingToChild) {
        // If the parent is not routing to the child, we need to update the parent
        // to include the child in the routing with an empty condition, which means that no data is routed.
        // The user can set the condition later on the parent
        await this.updateStreamRouting({
          definition: parentDefinition,
          routing: parentDefinition.ingest.routing.concat({
            destination: name,
            if: { never: {} },
          }),
        });
      }
    } else if (isWiredStreamDefinition(stream)) {
      // if there is no parent, this is either the root stream, or
      // there are intermediate streams missing in the tree.
      // In the latter case, we need to create the intermediate streams first.
      const parentId = getParentId(stream.name);
      if (parentId) {
        await this.upsertStream({
          name: parentId,
          request: {
            dashboards: [],
            stream: {
              ingest: {
                lifecycle: { inherit: {} },
                processing: [],
                routing: [
                  {
                    destination: stream.name,
                    if: { never: {} },
                  },
                ],
                wired: {
                  fields: {},
                },
              },
            },
          },
        });
      }
    }

    await this.dependencies.assetClient.syncAssetList({
      entityId: stream.name,
      entityType: 'stream',
      assetIds: dashboards,
      assetType: 'dashboard',
    });

    return { acknowledged: true, result };
  }
  /**
   * `validateAndUpsertStream` does the following things:
   * - determining whether the given definition is valid
   * - creating empty streams for non-existing children
   * - synchronizes the Elasticsearch objects
   * - updating the stored stream definition document
   */
  private async validateAndUpsertStream({ definition }: { definition: StreamDefinition }): Promise<{
    result: 'created' | 'updated';
    parentDefinition?: WiredStreamDefinition;
  }> {
    if (isWiredStreamDefinition(definition)) {
      await this.assertNoHierarchicalConflicts(definition.name);
    }

    const existingDefinition = await this.getStream(definition.name).catch((error) => {
      if (isDefinitionNotFoundError(error)) {
        return undefined;
      }
      throw error;
    });

    // we need to return this to allow consumers to update the routing of the parent
    let parentDefinition: WiredStreamDefinition | undefined;

    if (existingDefinition) {
      // Only allow wired-to-wired and ingest-to-ingest updates
      validateStreamTypeChanges(existingDefinition, definition);
    }

    if (isGroupStreamDefinition(definition)) {
      await this.assertValidGroupMembers({ definition });
    }

    if (isRootStreamDefinition(definition)) {
      // only allow selective updates to a root stream
      validateRootStreamChanges(
        (existingDefinition as undefined | WiredStreamDefinition) || rootStreamDefinition,
        definition
      );
    }

    validateStreamLifecycle(definition, this.dependencies.isServerless);

    if (isWiredStreamDefinition(definition)) {
      const validateWiredStreamResult = await this.validateWiredStreamAndCreateChildrenIfNeeded({
        existingDefinition: existingDefinition as WiredStreamDefinition,
        definition,
      });

      parentDefinition = validateWiredStreamResult.parentDefinition;
    } else if (isUnwiredStreamDefinition(definition)) {
      // condition to be removed once ILM is implemented for unwired streams
      if (isDslLifecycle(definition.ingest.lifecycle)) {
        const dataStream = await this.getDataStream(definition.name);
        const effectiveLifecycle = getDataStreamLifecycle(dataStream);
        if (isIlmLifecycle(effectiveLifecycle)) {
          throw new MalformedStreamError(
            'Cannot use DSL for unwired stream as it is currently using ILM'
          );
        }
      }
    }

    const result = !!existingDefinition ? ('updated' as const) : ('created' as const);

    await this.syncStreamObjects({
      definition,
    });

    await this.updateStoredStream(definition);

    return {
      result,
      parentDefinition,
    };
  }

  private async assertNoHierarchicalConflicts(definitionName: string) {
    const streamNames = [...getAncestors(definitionName), definitionName];
    const hasConflict = await Promise.all(
      streamNames.map((streamName) => this.isStreamNameTaken(streamName))
    );
    const conflicts = streamNames.filter((_, index) => hasConflict[index]);

    if (conflicts.length !== 0) {
      throw new NameTakenError(
        `Cannot create stream "${definitionName}" due to hierarchical conflicts caused by existing unwired stream definition, index or data stream: [${conflicts.join(
          ', '
        )}]`
      );
    }
  }

  private async isStreamNameTaken(streamName: string): Promise<boolean> {
    try {
      const definition = await this.getStream(streamName);
      return isUnwiredStreamDefinition(definition);
    } catch (error) {
      if (!isDefinitionNotFoundError(error)) {
        throw error;
      }
    }

    try {
      await this.dependencies.scopedClusterClient.asCurrentUser.indices.get({
        index: streamName,
      });

      return true;
    } catch (error) {
      if (isElasticsearch404(error)) {
        return false;
      }

      throw error;
    }
  }

  /**
   * Validates whether:
   * - there are no conflicting field types,
   * - the parent is not an ingest stream
   *
   * It also creates children that do not exist.
   */
  private async validateWiredStreamAndCreateChildrenIfNeeded({
    existingDefinition,
    definition,
  }: {
    existingDefinition?: WiredStreamDefinition;
    definition: WiredStreamDefinition;
  }): Promise<{ parentDefinition?: WiredStreamDefinition }> {
    const [ancestors, descendants] = await Promise.all([
      this.getAncestors(definition.name),
      this.getDescendants(definition.name),
    ]);

    const descendantsById = keyBy(descendants, (stream) => stream.name);

    const parentId = getParentId(definition.name);

    const parentDefinition = parentId
      ? ancestors.find((parent) => parent.name === parentId)
      : undefined;

    // If no existing definition exists, this is a fork via upsert,
    // and we need to validate whether the parent is a wired stream
    if (
      !existingDefinition &&
      parentId &&
      parentDefinition &&
      !isWiredStreamDefinition(parentDefinition)
    ) {
      throw new MalformedStreamIdError('Cannot fork a stream that is not managed');
    }

    validateAncestorFields({
      ancestors,
      fields: definition.ingest.wired.fields,
    });

    validateDescendantFields({
      descendants,
      fields: definition.ingest.wired.fields,
    });

    if (existingDefinition) {
      validateStreamChildrenChanges(existingDefinition, definition);
    }

    for (const item of definition.ingest.routing) {
      if (descendantsById[item.destination]) {
        continue;
      }
      if (!isChildOf(definition.name, item.destination)) {
        throw new MalformedStreamIdError(
          `The ID (${item.destination}) from the child stream must start with the parent's name (${definition.name}), followed by a dot and a name`
        );
      }
      await this.validateAndUpsertStream({
        definition: {
          name: item.destination,
          ingest: {
            lifecycle: { inherit: {} },
            processing: [],
            routing: [],
            wired: {
              fields: {},
            },
          },
        },
      });
    }

    return { parentDefinition };
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
    const parentDefinition = asIngestStreamDefinition(await this.getStream(parent));

    const childDefinition: WiredStreamDefinition = {
      name,
      ingest: { lifecycle: { inherit: {} }, processing: [], routing: [], wired: { fields: {} } },
    };

    // check whether root stream has a child of the given name already
    if (parentDefinition.ingest.routing.some((item) => item.destination === childDefinition.name)) {
      throw new MalformedStreamIdError(
        `The stream with ID (${name}) already exists as a child of the parent stream`
      );
    }
    if (!isChildOf(parentDefinition.name, childDefinition.name)) {
      throw new MalformedStreamIdError(
        `The ID (${name}) from the new stream must start with the parent's name (${parentDefinition.name}), followed by a dot and a name`
      );
    }

    // need to create the child first, otherwise we risk streaming data even though the child data stream is not ready

    const { parentDefinition: updatedParentDefinition } = await this.validateAndUpsertStream({
      definition: childDefinition,
    });

    await this.updateStreamRouting({
      definition: updatedParentDefinition!,
      routing: parentDefinition.ingest.routing.concat({
        destination: name,
        if: condition,
      }),
    });

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
        if (isElasticsearch404(error)) {
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
        if (isElasticsearch404(error)) {
          const dataStream = await this.getDataStream(name);
          return this.getDataStreamAsIngestStream(dataStream);
        }
        throw error;
      } catch (e) {
        if (isElasticsearch404(e)) {
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
   * Delete stream from definition. This has no access check,
   * which needs to happen in the consumer. This is to allow
   * us to delete the root stream internally.
   */
  private async deleteStreamFromDefinition(definition: StreamDefinition): Promise<void> {
    const { assetClient, logger, scopedClusterClient } = this.dependencies;

    if (isUnwiredStreamDefinition(definition)) {
      await deleteUnmanagedStreamObjects({
        scopedClusterClient,
        name: definition.name,
        logger,
      });
    } else if (isWiredStreamDefinition(definition)) {
      const parentId = getParentId(definition.name);

      // need to update parent first to cut off documents streaming down
      if (parentId) {
        const parentDefinition = (await this.getStream(parentId)) as WiredStreamDefinition;

        await this.updateStreamRouting({
          definition: parentDefinition,
          routing: parentDefinition.ingest.routing.filter(
            (item) => item.destination !== definition.name
          ),
        });
      }

      // delete the children first, as this will update
      // the parent as well
      for (const item of definition.ingest.routing) {
        await this.deleteStream(item.destination);
      }

      await deleteStreamObjects({ scopedClusterClient, name: definition.name, logger });
    }

    await assetClient.syncAssetList({
      entityId: definition.name,
      entityType: 'stream',
      assetType: 'dashboard',
      assetIds: [],
    });

    await this.dependencies.storageClient.delete({ id: definition.name });
  }

  /**
   * Updates the routing of the stream, and synchronizes
   * the Elasticsearch objects. This allows us to update
   * only the routing of a parent, without triggering
   * a cascade of updates due to how `upsertStream` works.
   */
  private async updateStreamRouting({
    definition,
    routing,
  }: {
    definition: WiredStreamDefinition;
    routing: WiredStreamDefinition['ingest']['routing'];
  }) {
    const update = cloneDeep(definition);
    update.ingest.routing = routing;

    await this.updateStoredStream(update);

    await this.syncStreamObjects({
      definition: update,
    });
  }

  /**
   * Deletes a stream, and its Elasticsearch objects, and its data.
   * Also verifies whether the user has access to the stream.
   */
  async deleteStream(name: string): Promise<DeleteStreamResponse> {
    const definition = await this.getStream(name).catch((error) => {
      if (isDefinitionNotFoundError(error)) {
        return undefined;
      }
      throw error;
    });

    const access =
      definition && isGroupStreamDefinition(definition)
        ? { write: true, read: true }
        : await checkAccess({
            name,
            scopedClusterClient: this.dependencies.scopedClusterClient,
          });

    if (!access.write) {
      throw new SecurityError(`Cannot delete stream, insufficient privileges`);
    }

    if (!definition) {
      return { acknowledged: true, result: 'noop' };
    }

    if (isWiredStreamDefinition(definition)) {
      const parentId = getParentId(name);
      if (!parentId) {
        throw new MalformedStreamIdError('Cannot delete root stream');
      }
    }

    await this.deleteStreamFromDefinition(definition);

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

  /**
   * Updates either the dlm or ilm policy of a stream. A lifecycle being
   * inherited, any updates to a given data stream also triggers an update
   * to existing children data streams that do not specify an override.
   */
  private async updateStreamLifecycle(root: StreamDefinition, lifecycle: IngestStreamLifecycle) {
    const { logger, scopedClusterClient } = this.dependencies;
    const inheritingStreams = isWiredStreamDefinition(root)
      ? findInheritingStreams(root, await this.getDescendants(root.name))
      : [root.name];

    await updateDataStreamsLifecycle({
      esClient: scopedClusterClient.asCurrentUser,
      names: inheritingStreams,
      isServerless: this.dependencies.isServerless,
      lifecycle,
      logger,
    });
  }
}
