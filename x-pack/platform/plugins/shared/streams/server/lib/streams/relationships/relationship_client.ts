/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';
import { termQuery } from '@kbn/es-query';
import type {
  IStorageClient,
  StorageClientDeleteResponse,
  StorageClientIndexResponse,
} from '@kbn/storage-adapter';
import type { Relationship } from '@kbn/streams-schema';
import {
  RELATIONSHIP_UUID,
  FROM_STREAM,
  TO_STREAM,
  RELATIONSHIP_DESCRIPTION,
  RELATIONSHIP_DIRECTION,
  RELATIONSHIP_SOURCE,
  RELATIONSHIP_CONFIDENCE,
  RELATIONSHIP_UPDATED_AT,
} from './fields';
import type { RelationshipStorageSettings } from './storage_settings';
import type { StoredRelationship } from './stored_relationship';
import { RelationshipNotFoundError } from '../errors/relationship_not_found_error';

export class RelationshipClient {
  constructor(
    private readonly clients: {
      storageClient: IStorageClient<RelationshipStorageSettings, StoredRelationship>;
    }
  ) {}

  /**
   * Generate a deterministic UUID for a relationship based on stream names.
   * For bidirectional relationships, we sort stream names to ensure
   * the same relationship isn't stored twice with different UUIDs.
   */
  private getRelationshipUuid(
    fromStream: string,
    toStream: string,
    direction: Relationship['direction']
  ): string {
    if (direction === 'bidirectional') {
      // Sort stream names for bidirectional relationships
      const [streamA, streamB] = [fromStream, toStream].sort();
      return objectHash({
        [FROM_STREAM]: streamA,
        [TO_STREAM]: streamB,
      });
    }
    return objectHash({
      [FROM_STREAM]: fromStream,
      [TO_STREAM]: toStream,
    });
  }

  private fromStorage(stored: StoredRelationship): Relationship {
    const relationship: Relationship = {
      from_stream: stored[FROM_STREAM],
      to_stream: stored[TO_STREAM],
      description: stored[RELATIONSHIP_DESCRIPTION],
      direction: stored[RELATIONSHIP_DIRECTION],
      source: stored[RELATIONSHIP_SOURCE],
    };

    if (stored[RELATIONSHIP_CONFIDENCE] !== undefined) {
      relationship.confidence = stored[RELATIONSHIP_CONFIDENCE];
    }

    return relationship;
  }

  private toStorage(relationship: Relationship): StoredRelationship {
    const uuid = this.getRelationshipUuid(
      relationship.from_stream,
      relationship.to_stream,
      relationship.direction
    );

    const stored: StoredRelationship = {
      [RELATIONSHIP_UUID]: uuid,
      [FROM_STREAM]: relationship.from_stream,
      [TO_STREAM]: relationship.to_stream,
      [RELATIONSHIP_DESCRIPTION]: relationship.description,
      [RELATIONSHIP_DIRECTION]: relationship.direction,
      [RELATIONSHIP_SOURCE]: relationship.source,
      [RELATIONSHIP_UPDATED_AT]: new Date().toISOString(),
    };

    if (relationship.confidence !== undefined) {
      stored[RELATIONSHIP_CONFIDENCE] = relationship.confidence;
    }

    return stored;
  }

  /**
   * Link a relationship between two streams.
   */
  async linkRelationship(relationship: Relationship): Promise<StorageClientIndexResponse> {
    const document = this.toStorage(relationship);
    return await this.clients.storageClient.index({
      id: document[RELATIONSHIP_UUID],
      document,
    });
  }

  /**
   * Unlink a relationship between two streams.
   */
  async unlinkRelationship(
    fromStream: string,
    toStream: string,
    direction: Relationship['direction']
  ): Promise<StorageClientDeleteResponse> {
    const id = this.getRelationshipUuid(fromStream, toStream, direction);
    const result = await this.clients.storageClient.delete({ id });
    if (result.result === 'not_found') {
      throw new RelationshipNotFoundError(
        `Relationship between ${fromStream} and ${toStream} not found`
      );
    }
    return result;
  }

  /**
   * Get all relationships for a given stream (as either from_stream or to_stream).
   */
  async getRelationships(streamName: string): Promise<{
    relationships: Relationship[];
    total: number;
  }> {
    const response = await this.clients.storageClient.search({
      size: 10_000,
      track_total_hits: true,
      query: {
        bool: {
          should: [...termQuery(FROM_STREAM, streamName), ...termQuery(TO_STREAM, streamName)],
          minimum_should_match: 1,
        },
      },
    });

    return {
      relationships: response.hits.hits.map((hit) => this.fromStorage(hit._source)),
      total: response.hits.total.value,
    };
  }

  /**
   * Get a specific relationship between two streams.
   */
  async getRelationship(
    fromStream: string,
    toStream: string,
    direction: Relationship['direction']
  ): Promise<Relationship> {
    const id = this.getRelationshipUuid(fromStream, toStream, direction);
    const hit = await this.clients.storageClient.get({ id });
    return this.fromStorage(hit._source!);
  }

  /**
   * Delete all relationships for a given stream.
   * Used when a stream is deleted to clean up all its relationships.
   */
  async deleteRelationshipsForStream(streamName: string): Promise<{ deleted: number }> {
    const { relationships } = await this.getRelationships(streamName);

    if (relationships.length === 0) {
      return { deleted: 0 };
    }

    const operations = relationships.map((rel) => ({
      delete: {
        _id: this.getRelationshipUuid(rel.from_stream, rel.to_stream, rel.direction),
      },
    }));

    await this.clients.storageClient.bulk({
      operations,
      throwOnFail: true,
    });

    return { deleted: relationships.length };
  }

  /**
   * Clean the entire relationships index.
   */
  async clean(): Promise<void> {
    await this.clients.storageClient.clean();
  }
}
