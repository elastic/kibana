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
import { ExecutionPlan } from './execution_plan';

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
  private dependencies: StateDependencies;

  // Usage of State should only happen via static State.attemptChanges
  private constructor(streams: StreamActiveRecord[], dependencies: StateDependencies) {
    this.streamsByName = new Map();
    streams.forEach((stream) => this.streamsByName.set(stream.definition.name, stream));
    this.dependencies = dependencies;
  }

  clone(): State {
    const newStreams = this.all().map((stream) => stream.clone());
    return new State(newStreams, this.dependencies);
  }

  // What should this function return?
  static async attemptChanges(
    requestedChanges: StreamChange[],
    dependencies: StateDependencies,
    dryRun: boolean = false
  ) {
    const startingState = await State.currentState(dependencies);

    const desiredState = await startingState.applyChanges(requestedChanges);

    const validationResult = await desiredState.validate(startingState);

    if (!validationResult.isValid) {
      // How do these translate to HTTP errors?
      throw new Error(validationResult.errors.join(', '));
    }

    if (dryRun) {
      const changedStreams = desiredState.changedStreams();
      const elasticsearchActions = desiredState.determineElasticsearchActions(
        changedStreams,
        desiredState,
        startingState
      );
      return {
        changedStreams,
        elasticsearchActions,
      };
    } else {
      try {
        await desiredState.commitChanges(desiredState, startingState);
      } catch (error) {
        await desiredState.attemptRollback(startingState);
      }
    }
  }

  static async currentState(dependencies: StateDependencies): Promise<State> {
    try {
      const streamsSearchResponse = await dependencies.storageClient.search({
        size: 10000, // Paginate if there are more...
        sort: [{ name: 'asc' }],
        track_total_hits: false,
      });

      const streams = streamsSearchResponse.hits.hits.map(({ _source: definition }) =>
        streamFromDefinition(definition, dependencies)
      );

      // State might need to be enriched with more information about these stream instances, like their existing ES resources
      return new State(streams, dependencies);
    } catch (error) {
      throw new Error(`Failed to load current Streams state due to: ${error.message}`);
    }
  }

  async applyChanges(requestedChanges: StreamChange[]): Promise<State> {
    const startingState = this;
    const desiredState = startingState.clone();

    for (const requestedChange of requestedChanges) {
      // Apply one change and any cascading changes from that change
      await this.applyRequestedChange(requestedChange, desiredState, startingState);
    }

    // Here we might return { changedSuccessfully: boolean; errors: Error[] }
    return desiredState;
  }

  async applyRequestedChange(
    requestedChange: StreamChange,
    desiredState: State,
    startingState: State
  ) {
    const cascadingChanges = await this.applyChange(requestedChange, desiredState, startingState);

    await this.applyCascadingChanges(cascadingChanges, desiredState, startingState);
  }

  async applyCascadingChanges(
    cascadingChanges: StreamChange[],
    desiredState: State,
    startingState: State
  ) {
    let iterationCounter = 0;
    let currentCascadingChanges: StreamChange[] = [...cascadingChanges];

    while (currentCascadingChanges.length !== 0) {
      const newCascadingChanges: StreamChange[] = [];
      for (const cascadingChange of currentCascadingChanges) {
        const newChanges = await this.applyChange(cascadingChange, desiredState, startingState);
        newCascadingChanges.push(...newChanges);
      }
      currentCascadingChanges = newCascadingChanges;
      if (++iterationCounter > 100) {
        throw new Error('Excessive cascading changes');
      }
    }
  }

  async applyChange(
    change: StreamChange,
    desiredState: State,
    startingState: State
  ): Promise<StreamChange[]> {
    if (!desiredState.has(change.target)) {
      if (change.type === 'delete') {
        // Not sure if throwing or ignoring is better here, the desired state is without this stream which is correct...
        throw new Error('Cannot delete non-existing stream');
      }

      const newStream = streamFromDefinition(change.request.stream, this.dependencies);
      desiredState.set(newStream.definition.name, newStream);
    }

    const cascadingChanges: StreamChange[][] = [];
    for (const stream of desiredState.all()) {
      const newChanges = await stream.applyChange(change, desiredState, startingState);
      cascadingChanges.push(newChanges);
    }
    return cascadingChanges.flat();
  }

  async validate(startingState: State): Promise<ValidationResult> {
    const desiredState = this;
    const validationResults = await Promise.all(
      this.all().map((stream) => stream.validate(desiredState, startingState))
    );

    const isValid = validationResults.every((validationResult) => validationResult.isValid);
    const errors = validationResults.flatMap((validationResult) => validationResult.errors);

    return {
      isValid,
      errors,
    };
  }

  changedStreams() {
    return this.all().filter((stream) => stream.hasChanged());
  }

  async commitChanges(desiredState: State, startingState: State) {
    const executionPlan = new ExecutionPlan(this.dependencies);
    executionPlan.plan(
      await this.determineElasticsearchActions(this.changedStreams(), desiredState, startingState)
    );
    executionPlan.execute();
  }

  async attemptRollback(startingState: State) {
    const brokenState = this;
    // TODO: I don't think this fully works, we might need to go through a proper planning cycle here again
    // or somehow signal that it shouldn't do change detection but play it save
    const rollbackTargets = brokenState.changedStreams().map((stream) => {
      if (startingState.has(stream.definition.name)) {
        return startingState.get(stream.definition.name)!;
      } else {
        const createdStreamToCleanUp = stream.clone();
        createdStreamToCleanUp.markAsDeleted();
        return createdStreamToCleanUp;
      }
    });

    const executionPlan = new ExecutionPlan(this.dependencies);
    executionPlan.plan(
      await this.determineElasticsearchActions(rollbackTargets, startingState, brokenState)
    );
    executionPlan.execute();
  }

  async determineElasticsearchActions(
    changedStreams: StreamActiveRecord[],
    desiredState: State,
    startingState: State
  ) {
    const actions = await Promise.all(
      changedStreams.map((stream) =>
        stream.determineElasticsearchActions(
          desiredState,
          startingState,
          startingState.get(stream.definition.name)
        )
      )
    );
    return actions.flat();
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
}
