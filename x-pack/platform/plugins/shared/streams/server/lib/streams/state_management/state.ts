/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient, Logger } from '@kbn/core/server';
import { WiredStreamUpsertRequest } from '@kbn/streams-schema';
import { StreamsStorageClient } from '../service';
import { StreamActiveRecord, ValidationResult } from './stream_active_record';
import { streamFromDefinition } from './stream_from_definition';
import { AssetClient } from '../assets/asset_client';

interface StateDependencies {
  scopedClusterClient: IScopedClusterClient;
  assetClient: AssetClient;
  storageClient: StreamsStorageClient;
  logger: Logger;
  isServerless: boolean;
}

interface WiredStreamUpsertChange {
  target: string;
  type: 'wired_upsert';
  request: WiredStreamUpsertRequest & {
    stream: {
      name: string;
    };
  };
}

interface StreamDeleteChange {
  target: string;
  type: 'delete';
}

export type StreamChange = WiredStreamUpsertChange | StreamDeleteChange;

export class State {
  private streamsByName: Map<string, StreamActiveRecord>;

  constructor(streams: StreamActiveRecord[]) {
    this.streamsByName = new Map();
    streams.forEach((stream) => this.streamsByName.set(stream.definition.name, stream));
  }

  async applyChanges(requestedChanges: StreamChange[], logger: Logger): Promise<State> {
    const startingState = this;
    const desiredState = startingState.clone();

    for (const requestedChange of requestedChanges) {
      // Apply one change and any cascading changes from that change
      await this.applyRequestedChange(requestedChange, desiredState, startingState, logger);
    }

    // Here we might return { changedSuccessfully: boolean; errors: Error[] }
    return desiredState;
  }

  private async applyRequestedChange(
    requestedChange: StreamChange,
    desiredState: State,
    startingState: State,
    logger: Logger
  ) {
    const cascadingChanges = await this.applyChange(requestedChange, desiredState, startingState);

    const excessiveCascadingChanges = await this.applyCascadingChanges(
      cascadingChanges,
      desiredState,
      startingState
    );

    // We only allow one round of cascading changes
    if (excessiveCascadingChanges.length !== 0) {
      logger.warn(`A requested change lead to multiple levels of cascading changes:`);
      logger.warn(`Requested change: ${requestedChange}`);
      logger.warn(`Cascading changes: ${cascadingChanges}`);
      logger.warn(`Excessive cascading changes: ${excessiveCascadingChanges}`);
    }
  }

  private async applyCascadingChanges(
    cascadingChanges: StreamChange[],
    desiredState: State,
    startingState: State
  ): Promise<StreamChange[]> {
    const excessiveCascadingChanges: StreamChange[][] = [];

    for (const cascadingChange of cascadingChanges) {
      const newChanges = await this.applyChange(cascadingChange, desiredState, startingState);
      excessiveCascadingChanges.push(newChanges);
    }

    return excessiveCascadingChanges.flat();
  }

  private async applyChange(
    change: StreamChange,
    desiredState: State,
    startingState: State
  ): Promise<StreamChange[]> {
    if (!desiredState.has(change.target)) {
      if (change.type === 'delete') {
        // Not sure if throwing or ignoring is better here, the desired state is without this stream which is correct...
        throw new Error('Cannot delete non-existing stream');
      }

      const newStream = streamFromDefinition(change.request.stream);
      desiredState.set(newStream.definition.name, newStream);
    }

    const cascadingChanges: StreamChange[][] = [];
    for (const stream of desiredState.all()) {
      const newChanges = await stream.applyChange(change, desiredState, startingState);
      cascadingChanges.push(newChanges);
    }
    return cascadingChanges.flat();
  }

  private clone(): State {
    const newStreams = this.all().map((stream) => stream.clone());
    return new State(newStreams);
  }

  async validate(
    startingState: State,
    scopedClusterClient: IScopedClusterClient
  ): Promise<ValidationResult> {
    const desiredState = this;
    const validationResults = await Promise.all(
      this.all().map((stream) => stream.validate(desiredState, startingState, scopedClusterClient))
    );

    const isValid = validationResults.every((validationResult) => validationResult.isValid);
    const errors = validationResults.flatMap((validationResult) => validationResult.errors);

    return {
      isValid,
      errors,
    };
  }

  changes() {
    return this.all().filter((stream) => stream.hasChanged());
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
    const desiredState = this;
    await Promise.all(
      this.changes()
        .filter((stream) => stream.hasCommitted())
        .map((stream) =>
          stream.revert(
            desiredState,
            startingState,
            storageClient,
            logger,
            scopedClusterClient,
            isServerless
          )
        )
    );
  }

  get(name: string) {
    return this.streamsByName.get(name);
  }

  set(name: string, stream: StreamActiveRecord) {
    this.streamsByName.set(name, stream);
  }

  all() {
    return Array.from(this.streamsByName.values());
  }

  has(name: string) {
    return this.streamsByName.has(name);
  }

  // What should this function return?
  static async attemptChanges(
    requestedChanges: StreamChange[],
    dependencies: StateDependencies,
    dryRun: boolean = false
  ) {
    const startingState = await State.currentState(dependencies.storageClient);

    const desiredState = await startingState.applyChanges(requestedChanges, dependencies.logger);

    const validationResult = await desiredState.validate(
      startingState,
      dependencies.scopedClusterClient
    );

    if (!validationResult.isValid) {
      // How do these translate to HTTP errors?
      throw new Error(validationResult.errors.join(', '));
    }

    if (dryRun) {
      // Perhaps we can/should compute some kind of diff here instead to make it easier for the UI to present what (in more detail) has changed?
      return desiredState.changes();
    } else {
      try {
        await desiredState.commitChanges(
          dependencies.storageClient,
          dependencies.logger,
          dependencies.scopedClusterClient,
          dependencies.isServerless
        );
      } catch (error) {
        await desiredState.attemptRollback(
          startingState,
          dependencies.storageClient,
          dependencies.logger,
          dependencies.scopedClusterClient,
          dependencies.isServerless
        );
      }
    }
  }

  private static async currentState(storageClient: StreamsStorageClient): Promise<State> {
    try {
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
    } catch (error) {
      throw new Error(`Failed to load current Streams state due to: ${error.message}`);
    }
  }
}
