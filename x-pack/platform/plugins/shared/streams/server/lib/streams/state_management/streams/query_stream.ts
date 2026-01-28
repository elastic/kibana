/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, isEqual } from 'lodash';
import { validateQuery } from '@kbn/esql-language';
import { Streams, getEsqlViewName } from '@kbn/streams-schema';
import { StatusError } from '../../errors/status_error';
import { getEsqlView } from '../../esql_views/manage_esql_views';
import type { ElasticsearchAction } from '../execution_plan/types';
import type { State } from '../state';
import type {
  StreamChangeStatus,
  ValidationResult,
} from '../stream_active_record/stream_active_record';
import { StreamActiveRecord } from '../stream_active_record/stream_active_record';
import type { StateDependencies, StreamChange } from '../types';

export class QueryStream extends StreamActiveRecord<Streams.QueryStream.Definition> {
  constructor(definition: Streams.QueryStream.Definition, dependencies: StateDependencies) {
    super(definition, dependencies);
  }

  protected doClone(): StreamActiveRecord<Streams.QueryStream.Definition> {
    return new QueryStream(cloneDeep(this._definition), this.dependencies);
  }

  protected async doHandleUpsertChange(
    definition: Streams.all.Definition,
    desiredState: State,
    startingState: State
  ): Promise<{ cascadingChanges: StreamChange[]; changeStatus: StreamChangeStatus }> {
    if (definition.name !== this._definition.name) {
      return { cascadingChanges: [], changeStatus: this.changeStatus };
    }

    if (!Streams.QueryStream.Definition.is(definition)) {
      throw new StatusError('Cannot change stream types', 400);
    }

    this._definition = definition;

    const cascadingChanges: StreamChange[] = [];

    return { cascadingChanges, changeStatus: 'upserted' };
  }

  protected async doHandleDeleteChange(
    target: string,
    desiredState: State,
    startingState: State
  ): Promise<{ cascadingChanges: StreamChange[]; changeStatus: StreamChangeStatus }> {
    if (target === this._definition.name) {
      return { cascadingChanges: [], changeStatus: 'deleted' };
    }

    if (!this.isDeleted()) {
      // We need to run validation to check that all related streams still exist
      return { cascadingChanges: [], changeStatus: 'upserted' };
    }

    return { cascadingChanges: [], changeStatus: this.changeStatus };
  }

  protected async doValidateUpsertion(
    desiredState: State,
    startingState: State
  ): Promise<ValidationResult> {
    const errors: Error[] = [];

    // Validate that stream name is not empty
    if (!this._definition.name || this._definition.name.trim() === '') {
      errors.push(new Error('Stream name cannot be empty'));
    }

    // Validate that query is defined
    if (!this._definition.query) {
      errors.push(new Error('Query is required for query streams'));
      return { isValid: false, errors };
    }

    // Validate that view name is defined
    if (!this._definition.query.view) {
      errors.push(new Error('Query view reference is required'));
      return { isValid: false, errors };
    }

    // Validate that esql is defined (required for upsert)
    if (!this._definition.query.esql || this._definition.query.esql.trim() === '') {
      errors.push(new Error('ES|QL query cannot be empty'));
      return { isValid: false, errors };
    }

    // Validate ES|QL syntax
    try {
      const { errors: esqlErrors } = await validateQuery(this._definition.query.esql);
      if (esqlErrors && esqlErrors.length > 0) {
        const errorMessages = esqlErrors.map((error) => {
          if ('text' in error) {
            return error.text;
          }
          if ('message' in error) {
            return error.message;
          }
          return 'Unknown ES|QL syntax error';
        });
        errors.push(...errorMessages.map((msg) => new Error(`ES|QL syntax error: ${msg}`)));
      }
    } catch (error) {
      errors.push(new Error(`Failed to validate ES|QL query: ${error.message}`));
    }

    // Validate the ES|QL query can be executed (basic test with LIMIT 0)
    try {
      await this.dependencies.scopedClusterClient.asCurrentUser.esql.query({
        query: `${this._definition.query.esql}\n| LIMIT 0`,
        format: 'json',
      });
    } catch (error) {
      if (error.message) {
        errors.push(new Error(`ES|QL query execution validation failed: ${error.message}`));
      } else {
        errors.push(new Error('ES|QL query execution validation failed'));
      }
    }

    // Validate that view name matches expected format
    const expectedViewName = getEsqlViewName(this._definition.name);
    if (this._definition.query.view !== expectedViewName) {
      errors.push(
        new Error(
          `Query view name must be "${expectedViewName}" for stream "${this._definition.name}"`
        )
      );
    }

    // Check for conflicts with existing streams
    const existingStream = startingState.get(this._definition.name);
    if (existingStream && !Streams.QueryStream.Definition.is(existingStream.definition)) {
      errors.push(
        new Error(
          `Cannot create query stream: a stream with name "${this._definition.name}" already exists as a different type`
        )
      );
    }

    return { isValid: errors.length === 0, errors };
  }

  protected async doValidateDeletion(
    desiredState: State,
    startingState: State
  ): Promise<ValidationResult> {
    const errors: Error[] = [];

    // Check if the stream exists in the starting state
    const existingStream = startingState.get(this._definition.name);
    if (!existingStream) {
      // It's okay to delete a non-existent stream (idempotent)
      return { isValid: true, errors: [] };
    }

    // Validate that it's actually a query stream
    if (!Streams.QueryStream.Definition.is(existingStream.definition)) {
      errors.push(
        new Error(
          `Cannot delete as query stream: stream "${this._definition.name}" is not a query stream`
        )
      );
      return { isValid: false, errors };
    }

    // Check if any other streams depend on this query stream
    // Query streams might be used as data sources in other streams
    const dependentStreams: string[] = [];
    for (const stream of startingState.all()) {
      if (stream.name === this._definition.name) {
        continue;
      }

      // Check if this stream references our query stream
      const definition = stream.definition;
      if (
        Streams.WiredStream.Definition.is(definition) &&
        definition.ingest.wired.routing.some(
          (route: { destination: string }) => route.destination === this._definition.name
        )
      ) {
        dependentStreams.push(stream.name);
      }
    }

    if (dependentStreams.length > 0) {
      errors.push(
        new Error(
          `Cannot delete query stream "${
            this._definition.name
          }": it is referenced by other streams: ${dependentStreams.join(', ')}`
        )
      );
    }

    return { isValid: errors.length === 0, errors };
  }

  protected async doDetermineCreateActions(): Promise<ElasticsearchAction[]> {
    // The ES|QL view must be created before the definition document
    // This ensures the view exists when the stream definition references it
    const actions: ElasticsearchAction[] = [];

    // Validate that we have the esql query to create the view
    if (!this._definition.query.esql) {
      throw new StatusError(
        'ES|QL query is required to create a query stream but was not found in definition',
        400
      );
    }

    // 1. Create the ES|QL view first
    actions.push({
      type: 'upsert_esql_view',
      request: {
        name: this._definition.query.view,
        query: this._definition.query.esql,
      },
    });

    // 2. Create the stream definition document (without the esql, only the view reference)
    // The stored definition only includes the view reference, not the actual esql query
    const definitionToStore = {
      ...this._definition,
      query: {
        view: this._definition.query.view,
      },
    };

    actions.push({
      type: 'upsert_dot_streams_document',
      request: definitionToStore as Streams.QueryStream.Definition,
    });

    return actions;
  }

  protected async doDetermineUpdateActions(
    desiredState: State,
    startingState: State,
    startingStateStream: QueryStream
  ): Promise<ElasticsearchAction[]> {
    const actions: ElasticsearchAction[] = [];

    // Check if the query has changed
    const queryChanged = this._definition.query.esql !== startingStateStream.definition.query.esql;

    // Check if other parts of the definition changed (excluding query)
    const { query: currentQuery, ...currentRest } = this._definition;
    const { query: startingQuery, ...startingRest } = startingStateStream.definition;
    const definitionChanged = !isEqual(currentRest, startingRest);

    // 1. Update the ES|QL view if the query changed
    if (queryChanged) {
      if (!this._definition.query.esql) {
        throw new StatusError('ES|QL query is required for update but was not provided', 400);
      }

      // Verify the view exists before updating
      try {
        await getEsqlView({
          esClient: this.dependencies.scopedClusterClient.asCurrentUser,
          logger: this.dependencies.logger,
          name: this._definition.query.view,
        });
      } catch (error) {
        // If view doesn't exist, we need to create it (shouldn't happen in normal flow)
        this.dependencies.logger.warn(
          `ES|QL view "${this._definition.query.view}" not found during update, will be created`
        );
      }

      actions.push({
        type: 'upsert_esql_view',
        request: {
          name: this._definition.query.view,
          query: this._definition.query.esql,
        },
      });
    }

    // 2. Update the definition document if anything changed
    if (queryChanged || definitionChanged) {
      // Strip the esql from the stored definition as it's only stored in the view
      const definitionToStore = {
        ...this._definition,
        query: {
          view: this._definition.query.view,
        },
      };

      actions.push({
        type: 'upsert_dot_streams_document',
        request: definitionToStore as Streams.QueryStream.Definition,
      });
    }

    return actions;
  }

  protected async doDetermineDeleteActions(): Promise<ElasticsearchAction[]> {
    return [
      {
        type: 'delete_dot_streams_document',
        request: {
          name: this._definition.name,
        },
      },
      {
        type: 'unlink_assets',
        request: {
          name: this._definition.name,
        },
      },
      {
        type: 'unlink_features',
        request: {
          name: this._definition.name,
        },
      },
      {
        type: 'delete_esql_view',
        request: {
          name: getEsqlViewName(this._definition.name),
        },
      },
    ];
  }
}
