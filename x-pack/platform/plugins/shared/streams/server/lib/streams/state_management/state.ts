/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient, Logger } from '@kbn/core/server';
import { StreamsStorageClient } from '../service';
import { StreamActiveRecord, StreamChange, ValidationResult } from './types';
import { streamFromDefinition } from './stream_from_definition';
import { StreamsRepository } from './stream_repository';

export class State {
  streams: StreamsRepository;

  constructor(streams: StreamActiveRecord[]) {
    this.streams = new StreamsRepository(streams);
  }

  applyChanges(requestedChanges: StreamChange[]): State {
    // What if multiple changes target the same stream?

    // Optional: Expand requested changes to include automatic creation of missing streams
    const newState = this.clone();

    requestedChanges.forEach((change) => {
      const targetStream = newState.streams.get(change.target);

      if (!targetStream) {
        if (change.type === 'delete') {
          throw new Error('Cannot delete non-existing stream');
        } else {
          const newStream = streamFromDefinition(change.request.stream);
          newStream.update(change.request.stream, newState, this);
          newState.streams.set(newStream.definition.name, newStream);
        }
      } else {
        if (change.type === 'delete') {
          targetStream.markForDeletion();
        } else {
          targetStream.update(change.request.stream, newState, this);
        }
      }
    });

    return newState;
  }

  private clone(): State {
    const newStreams = this.streams.all().map((stream) => stream.clone());
    return new State(newStreams);
  }

  async validate(
    startingState: State,
    scopedClusterClient: IScopedClusterClient
  ): Promise<ValidationResult> {
    // Should I use allSettled here?
    const validationResults = await Promise.all(
      this.streams.all().map((stream) => stream.validate(this, startingState, scopedClusterClient))
    );

    const isValid = validationResults.every((validationResult) => validationResult.isValid);
    const errors = validationResults.flatMap((validationResult) => validationResult.errors);

    return {
      isValid,
      errors,
    };
  }

  changes() {
    // Could there be conflicts between changes, like a group being updated with new members before that member is deleted?
    // I guess the deletion change for that member should catch that and update the group again or validation for the group should catch it
    // In reverse, the change for the group should check that the member was deleted and throw? And in any case the validation should catch it
    return this.streams.all().filter((stream) => stream.changeStatus !== 'unchanged');
  }

  async commitChanges(
    storageClient: StreamsStorageClient,
    logger: Logger,
    scopedClusterClient: IScopedClusterClient,
    isServerless: boolean
  ) {
    await Promise.all(
      this.changes().map((stream) =>
        stream.commit(storageClient, logger, scopedClusterClient, isServerless)
      )
    );
  }

  async attemptRollback(
    startingState: State,
    storageClient: StreamsStorageClient,
    logger: Logger,
    scopedClusterClient: IScopedClusterClient,
    isServerless: boolean
  ) {
    const changedStreams = this.changes().filter((stream) => stream.commitStatus !== 'uncomitted');

    const changes = changedStreams
      .map((stream) => {
        if (stream.changeStatus === 'upserted') {
          if (startingState.streams.has(stream.definition.name)) {
            // Stream was updated, revert to previous state
            return startingState.streams.get(stream.definition.name);
          } else {
            // Stream was created, delete it
            stream.markForDeletion();
            return stream;
          }
        } else if (stream.changeStatus === 'deleted') {
          // Stream was deleted, revert to previous state
          return startingState.streams.get(stream.definition.name);
        }
      })
      .filter((maybeStream): maybeStream is StreamActiveRecord => maybeStream !== undefined);

    await Promise.all(
      changes.map((stream) =>
        stream.commit(storageClient, logger, scopedClusterClient, isServerless)
      )
    );
  }

  static async currentState(storageClient: StreamsStorageClient): Promise<State> {
    const streamsSearchResponse = await storageClient.search({
      size: 10000, // Paginate if there are more...
      sort: [{ name: 'asc' }],
      track_total_hits: false,
    });

    const streams = streamsSearchResponse.hits.hits.map(({ _source: definition }) =>
      streamFromDefinition(definition)
    );

    // State might need to be enriched with more information about these stream instances, like their existing ES resources
    return new State(streams);
  }
}
