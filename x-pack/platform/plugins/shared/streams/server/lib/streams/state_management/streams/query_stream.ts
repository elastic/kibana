/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, isEqual } from 'lodash';
import { validateQuery } from '@kbn/esql-language';
import { Streams, getEsqlViewName, getParentId, isChildOf } from '@kbn/streams-schema';
import { getErrorMessage } from '../../errors/parse_error';
import { StatusError } from '../../errors/status_error';
import { getEsqlView } from '../../esql_views/manage_esql_views';
import type { ElasticsearchAction } from '../execution_plan/types';
import type { State } from '../state';
import type {
  StreamChangeStatus,
  StreamChanges,
  ValidationResult,
} from '../stream_active_record/stream_active_record';
import { StreamActiveRecord } from '../stream_active_record/stream_active_record';
import type { StateDependencies, StreamChange } from '../types';

interface QueryStreamChanges extends StreamChanges {
  query_streams: boolean;
}

export class QueryStream extends StreamActiveRecord<Streams.QueryStream.Definition> {
  protected _changes: QueryStreamChanges = {
    query_streams: false,
  };

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

    const startingStateStreamDefinition = startingState.get(this._definition.name)?.definition;

    this._definition = definition;

    // Track if query_streams changed
    if (
      startingStateStreamDefinition &&
      Streams.QueryStream.Definition.is(startingStateStreamDefinition)
    ) {
      this._changes.query_streams = !isEqual(
        this._definition.query_streams ?? [],
        startingStateStreamDefinition.query_streams ?? []
      );
    } else {
      // New stream - mark as changed if it has children
      this._changes.query_streams = (this._definition.query_streams ?? []).length > 0;
    }

    const cascadingChanges: StreamChange[] = [];
    const now = new Date().toISOString();

    // Handle adding this stream to parent's query_streams array
    const parentId = getParentId(this._definition.name);
    if (parentId) {
      const parentStream = desiredState.get(parentId);
      if (parentStream && !parentStream.hasChanged()) {
        const parentDef = parentStream.definition;
        const parentQueryStreams = parentDef.query_streams ?? [];
        const hasChild = parentQueryStreams.some((ref) => ref.name === this._definition.name);

        if (!hasChild) {
          // Need to update parent to include this child in query_streams
          cascadingChanges.push({
            type: 'upsert',
            definition: {
              ...parentDef,
              updated_at: now,
              query_streams: [...parentQueryStreams, { name: this._definition.name }],
            },
          });
        }
      }
    }

    return { cascadingChanges, changeStatus: 'upserted' };
  }

  protected async doHandleDeleteChange(
    target: string,
    desiredState: State,
    startingState: State
  ): Promise<{ cascadingChanges: StreamChange[]; changeStatus: StreamChangeStatus }> {
    if (target !== this._definition.name) {
      return { cascadingChanges: [], changeStatus: this.changeStatus };
    }

    const cascadingChanges: StreamChange[] = [];

    // Remove this stream from parent's query_streams array
    const parentId = getParentId(this._definition.name);
    if (parentId) {
      const parentStream = desiredState.get(parentId);
      if (parentStream && !parentStream.hasChanged()) {
        const parentDef = parentStream.definition;
        const parentQueryStreams = parentDef.query_streams ?? [];
        const hasChild = parentQueryStreams.some((ref) => ref.name === this._definition.name);

        if (hasChild) {
          cascadingChanges.push({
            type: 'upsert',
            definition: {
              ...parentDef,
              updated_at: new Date().toISOString(),
              query_streams: parentQueryStreams.filter((ref) => ref.name !== this._definition.name),
            },
          });
        }
      }
    }

    // Cascade delete to all children in query_streams
    const childQueryStreams = this._definition.query_streams ?? [];
    for (const childRef of childQueryStreams) {
      cascadingChanges.push({
        type: 'delete',
        name: childRef.name,
      });
    }

    return { cascadingChanges, changeStatus: 'deleted' };
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

    // When only query_streams references are being updated (e.g. parent updated via cascading
    // change when adding a child), the definition may not include the ES|QL query. Skip ES|QL
    // validations in that case.
    const existingStream = startingState.get(this._definition.name);
    const isQueryStreamsOnlyUpdate =
      existingStream != null &&
      Streams.QueryStream.Definition.is(existingStream.definition) &&
      (!this._definition.query.esql || this._definition.query.esql.trim() === '');

    if (!isQueryStreamsOnlyUpdate) {
      // Validate that esql is defined (required for create or when updating the query)
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
        errors.push(new Error(`Failed to validate ES|QL query: ${getErrorMessage(error)}`));
      }

      // Validate the ES|QL query can be executed (basic test with LIMIT 0)
      try {
        await this.dependencies.scopedClusterClient.asCurrentUser.esql.query({
          query: `${this._definition.query.esql}\n| LIMIT 0`,
          format: 'json',
        });
      } catch (error) {
        errors.push(
          new Error(`ES|QL query execution validation failed: ${getErrorMessage(error)}`)
        );
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
    if (existingStream && !Streams.QueryStream.Definition.is(existingStream.definition)) {
      errors.push(
        new Error(
          `Cannot create query stream: a stream with name "${this._definition.name}" already exists as a different type`
        )
      );
    }

    // Validate query_streams array
    const queryStreams = this._definition.query_streams ?? [];
    const children = new Set<string>();

    for (const childRef of queryStreams) {
      const childName = childRef.name;

      // Validate naming convention - child must follow parent.childname pattern
      if (!isChildOf(this._definition.name, childName)) {
        errors.push(
          new Error(
            `Child query stream "${childName}" must follow naming convention: "${this._definition.name}.<childname>"`
          )
        );
      }

      // Check for duplicates
      if (children.has(childName)) {
        errors.push(
          new Error(
            `Duplicate child query stream "${childName}" in query_streams of "${this._definition.name}"`
          )
        );
      }
      children.add(childName);

      // Validate that child exists in desired state as a query stream
      const childStream = desiredState.get(childName);
      if (!childStream) {
        errors.push(
          new Error(`Child query stream "${childName}" referenced in query_streams does not exist`)
        );
      } else if (
        !childStream.isDeleted() &&
        !Streams.QueryStream.Definition.is(childStream.definition)
      ) {
        errors.push(
          new Error(
            `Child "${childName}" in query_streams must be a query stream, but is a different type`
          )
        );
      }
    }

    // Validate that all child query streams (by naming convention) are in query_streams array
    for (const stream of desiredState.all()) {
      if (
        !stream.isDeleted() &&
        isChildOf(this._definition.name, stream.definition.name) &&
        Streams.QueryStream.Definition.is(stream.definition) &&
        !children.has(stream.definition.name)
      ) {
        errors.push(
          new Error(
            `Child query stream "${stream.definition.name}" is not listed in query_streams of its parent "${this._definition.name}"`
          )
        );
      }
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

    // Check if any other streams have this stream in their query_streams array
    const parentId = getParentId(this._definition.name);
    if (parentId) {
      const parentStream = desiredState.get(parentId);
      if (
        parentStream &&
        !parentStream.isDeleted() &&
        parentStream.definition.query_streams?.some((ref) => ref.name === this._definition.name)
      ) {
        // Parent will be updated via cascading change, so this is okay
        // The cascading change in doHandleDeleteChange removes this from parent
      }
    }

    // Note: Children will be cascade deleted via doHandleDeleteChange, so we don't need to block deletion
    // if there are children - they will be deleted along with this stream

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
    const { query, ...restDefinition } = this._definition;
    const definitionToStore = {
      ...restDefinition,
      query: {
        view: query.view,
      },
      // Include query_streams array if present
      ...(this._definition.query_streams && { query_streams: this._definition.query_streams }),
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

    // Check if query_streams changed
    const queryStreamsChanged = this._changes.query_streams;

    // Check if other parts of the definition changed (excluding query and query_streams)
    const { query: currentQuery, query_streams: currentQS, ...currentRest } = this._definition;
    const {
      query: startingQuery,
      query_streams: startingQS,
      ...startingRest
    } = startingStateStream.definition;
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
    if (queryChanged || definitionChanged || queryStreamsChanged) {
      // Strip the esql from the stored definition as it's only stored in the view
      const { query, ...restDefinition } = this._definition;
      const definitionToStore = {
        ...restDefinition,
        query: {
          view: query.view,
        },
        // Include query_streams array if present
        ...(this._definition.query_streams && { query_streams: this._definition.query_streams }),
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
