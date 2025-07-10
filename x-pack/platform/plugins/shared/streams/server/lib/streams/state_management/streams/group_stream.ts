/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNotFoundError } from '@kbn/es-errors';
import { Streams } from '@kbn/streams-schema';
import { cloneDeep } from 'lodash';
import { StatusError } from '../../errors/status_error';
import type { ElasticsearchAction } from '../execution_plan/types';
import type { State } from '../state';
import type { StateDependencies, StreamChange } from '../types';
import type {
  StreamChangeStatus,
  ValidationResult,
} from '../stream_active_record/stream_active_record';
import { StreamActiveRecord } from '../stream_active_record/stream_active_record';

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

    // Deduplicate members
    this._definition = {
      name: definition.name,
      description: definition.description,
      group: {
        ...definition.group,
        members: Array.from(new Set(definition.group.members)),
      },
    };

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
    // remove deleted streams from the group
    if (this.changeStatus !== 'deleted' && this._definition.group.members.includes(target)) {
      this._definition = {
        ...this._definition,
        group: {
          ...this._definition.group,
          members: this._definition.group.members.filter((member) => member !== target),
        },
      };
      return { cascadingChanges: [], changeStatus: 'upserted' };
    }

    return { cascadingChanges: [], changeStatus: this.changeStatus };
  }

  protected async doValidateUpsertion(
    desiredState: State,
    startingState: State
  ): Promise<ValidationResult> {
    if (this.isDeleted()) {
      return { isValid: true, errors: [] };
    }

    if (this._definition.name.startsWith('logs.')) {
      throw new StatusError('A group stream name can not start with [logs.]', 400);
    }

    const existsInStartingState = startingState.has(this._definition.name);

    if (!existsInStartingState) {
      // Check for conflicts
      try {
        const dataStreamResponse =
          await this.dependencies.scopedClusterClient.asCurrentUser.indices.getDataStream({
            name: this._definition.name,
          });

        if (dataStreamResponse.data_streams.length === 0) {
          return {
            isValid: false,
            errors: [
              new Error(
                `Cannot create group stream "${this._definition.name}" due to conflict caused by existing index`
              ),
            ],
          };
        }

        return {
          isValid: false,
          errors: [
            new Error(
              `Cannot create group stream "${this._definition.name}" due to conflict caused by existing data stream`
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
    for (const member of this._definition.group.members) {
      const memberStream = desiredState.get(member);
      if (!memberStream || memberStream.isDeleted()) {
        return {
          isValid: false,
          errors: [new Error(`Member stream ${member} not found`)],
        };
      }
      if (!Streams.ingest.all.Definition.is(memberStream.definition)) {
        return {
          isValid: false,
          errors: [new Error(`Member stream ${member} is neither a wired nor an unwired stream`)],
        };
      }
    }
    return { isValid: true, errors: [] };
  }

  protected async doValidateDeletion(
    desiredState: State,
    startingState: State
  ): Promise<ValidationResult> {
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
    return this.doDetermineCreateActions();
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
