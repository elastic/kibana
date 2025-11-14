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

    const missingMembers: string[] = [];
    for (const member of this._definition.group.members) {
      if (!desiredState.has(member)) {
        missingMembers.push(member);
      }
    }

    const existsAsDataStream = await Promise.all(
      missingMembers.map(async (member) => {
        try {
          const dataStreamResult =
            await this.dependencies.scopedClusterClient.asCurrentUser.indices.getDataStream({
              name: member,
            });

          return dataStreamResult.data_streams.length > 0 ? member : null;
        } catch (error) {
          if (!isNotFoundError(error)) {
            throw error;
          }
          return null;
        }
      })
    );

    const cascadingChanges: StreamChange[] = existsAsDataStream
      .filter((member): member is string => member !== null)
      .map((member) => ({
        type: 'upsert',
        definition: {
          name: member,
          description: '',
          ingest: {
            classic: {},
            lifecycle: { inherit: {} },
            processing: { steps: [] },
            settings: {},
            failure_store: { inherit: {} },
          },
        },
      }));

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

    if (!this.isDeleted() && this._definition.group.members.includes(target)) {
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

    // validate members
    const selfReference = this._definition.group.members.includes(this.name);
    if (selfReference) {
      return {
        isValid: false,
        errors: [new Error(`Group stream ${this.name} cannot have itself as a member`)],
      };
    }

    const missingMembers: string[] = [];
    for (const member of this._definition.group.members) {
      const relatedStream = desiredState.get(member);
      if (!relatedStream || relatedStream.isDeleted()) {
        missingMembers.push(member);
      }
    }
    if (missingMembers.length > 0) {
      return {
        isValid: false,
        errors: [
          new Error(
            `Group stream ${
              this.name
            } has the following members which were not found: ${missingMembers.join(', ')}`
          ),
        ],
      };
    }

    const duplicates = this._definition.group.members.filter(
      (name, index) => this._definition.group.members.indexOf(name) !== index
    );

    if (duplicates.length !== 0) {
      return {
        isValid: false,
        errors: [
          new Error(
            `Group stream ${
              this.name
            } cannot have the same member mentioned more than once: ${duplicates.join(',')}`
          ),
        ],
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
      .filter((stream) => stream.definition.group.members.includes(this.name));

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
    ];
  }
}
