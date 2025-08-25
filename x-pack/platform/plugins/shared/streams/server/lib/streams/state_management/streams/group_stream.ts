/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { Streams } from '@kbn/streams-schema';
import { isNotFoundError } from '@kbn/es-errors';
import { StatusError } from '../../errors/status_error';
import type { ElasticsearchAction } from '../execution_plan/types';
import type { State } from '../state';
import type {
  StreamChangeStatus,
  ValidationResult,
} from '../stream_active_record/stream_active_record';
import { StreamActiveRecord } from '../stream_active_record/stream_active_record';
import type { StateDependencies, StreamChange } from '../types';

export class GroupStream extends StreamActiveRecord<Streams.GroupStream.Definition> {
  constructor(definition: Streams.GroupStream.Definition, dependencies: StateDependencies) {
    super(definition, dependencies);
  }

  protected doClone(): StreamActiveRecord<Streams.GroupStream.Definition> {
    return new GroupStream(cloneDeep(this._definition), this.dependencies);
  }

  protected async doHandleUpsertChange(
    definition: Streams.all.Definition,
    desiredState: State,
    startingState: State
  ): Promise<{ cascadingChanges: StreamChange[]; changeStatus: StreamChangeStatus }> {
    if (definition.name !== this._definition.name) {
      return {
        changeStatus: this.changeStatus,
        cascadingChanges: [],
      };
    }

    if (!Streams.GroupStream.Definition.is(definition)) {
      throw new StatusError('Cannot change stream types', 400);
    }

    this._definition = definition;

    return { cascadingChanges: [], changeStatus: 'upserted' };
  }

  protected async doHandleDeleteChange(
    target: string,
    desiredState: State,
    startingState: State
  ): Promise<{ cascadingChanges: StreamChange[]; changeStatus: StreamChangeStatus }> {
    if (target === this._definition.name) {
      return { cascadingChanges: [], changeStatus: 'deleted' };
    }

    if (
      !this.isDeleted() &&
      this._definition.group.relationships.map((relationship) => relationship.name).includes(target)
    ) {
      // We need to run validation to check that all related streams still exist
      return { cascadingChanges: [], changeStatus: 'upserted' };
    }

    return { cascadingChanges: [], changeStatus: this.changeStatus };
  }

  protected async doValidateUpsertion(
    desiredState: State,
    startingState: State
  ): Promise<ValidationResult> {
    if (this._definition.name.startsWith('logs.')) {
      throw new StatusError('A Group stream name can not start with [logs.]', 400);
    }

    const existsInStartingState = startingState.has(this._definition.name);
    if (!existsInStartingState) {
      // Check for conflicts
      try {
        const dataStreamResult =
          await this.dependencies.scopedClusterClient.asCurrentUser.indices.getDataStream({
            name: this._definition.name,
          });

        if (dataStreamResult.data_streams.length === 0) {
          return {
            isValid: false,
            errors: [
              new Error(`Cannot create Group stream ${this.definition.name} due to existing index`),
            ],
          };
        }

        return {
          isValid: false,
          errors: [
            new Error(
              `Cannot create Group stream ${this.definition.name} due to existing data stream`
            ),
          ],
        };
      } catch (error) {
        if (!isNotFoundError(error)) {
          throw error;
        }
      }
    }

    // validate relationships
    const selfReference = this._definition.group.relationships.find(
      (relationship) => relationship.name === this.name
    );
    if (selfReference) {
      return {
        isValid: false,
        errors: [new Error(`Group stream ${this.name} cannot have a relationship to itself`)],
      };
    }

    for (const relationship of this._definition.group.relationships) {
      const relatedStream = desiredState.get(relationship.name);
      if (!relatedStream || relatedStream.isDeleted()) {
        return {
          isValid: false,
          errors: [
            new Error(
              `Group stream ${this.name} has a relationship to ${relationship.name} which was not found`
            ),
          ],
        };
      }
    }

    const relationshipNames = this._definition.group.relationships.map(
      (relationship) => relationship.name
    );
    const duplicates = relationshipNames.filter(
      (name, index) => relationshipNames.indexOf(name) !== index
    );

    if (duplicates.length !== 0) {
      return {
        isValid: false,
        errors: [
          new Error(
            `Group stream ${this.name} cannot reference the same stream twice: ${duplicates.join(
              ','
            )}`
          ),
        ],
      };
    }

    const parentRelationships = this._definition.group.relationships.filter(
      (relationship) => relationship.type === 'parent'
    );
    if (parentRelationships.length > 1) {
      return {
        isValid: false,
        errors: [new Error(`Group stream ${this.name} cannot have more than one parent`)],
      };
    }

    return { isValid: true, errors: [] };
  }

  protected async doValidateDeletion(
    desiredState: State,
    startingState: State
  ): Promise<ValidationResult> {
    const dependentGroupStreams = desiredState
      .all()
      .filter(
        (stream): stream is GroupStream =>
          stream.name !== this.name &&
          Streams.GroupStream.Definition.is(stream.definition) &&
          !stream.isDeleted()
      )
      .filter((stream) =>
        stream.definition.group.relationships
          .map((relatedStream) => relatedStream.name)
          .includes(this.name)
      );

    if (dependentGroupStreams.length !== 0) {
      return {
        isValid: false,
        errors: dependentGroupStreams.map(
          (stream) =>
            new Error(
              `Cannot delete Group stream ${this.name} because Group stream ${stream.name} depends on it`
            )
        ),
      };
    }

    return { isValid: true, errors: [] };
  }

  protected async doDetermineCreateActions(): Promise<ElasticsearchAction[]> {
    return [
      {
        type: 'upsert_dot_streams_document',
        request: this._definition,
      },
    ];
  }

  protected async doDetermineUpdateActions(): Promise<ElasticsearchAction[]> {
    return [
      {
        type: 'upsert_dot_streams_document',
        request: this._definition,
      },
    ];
  }

  protected async doDetermineDeleteActions(): Promise<ElasticsearchAction[]> {
    return [
      {
        type: 'delete_dot_streams_document',
        request: {
          name: this._definition.name,
        },
      },
    ];
  }
}
