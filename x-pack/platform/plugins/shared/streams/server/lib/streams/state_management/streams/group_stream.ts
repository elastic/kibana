/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GroupStreamDefinition, StreamDefinition } from '@kbn/streams-schema';
import { isGroupStreamDefinition } from '@kbn/streams-schema';
import { cloneDeep } from 'lodash';
import { StatusError } from '../../errors/status_error';
import type { ElasticsearchAction } from '../execution_plan/types';
import type { State } from '../state';
import type {
  StreamChangeStatus,
  ValidationResult,
} from '../stream_active_record/stream_active_record';
import { StreamActiveRecord } from '../stream_active_record/stream_active_record';
import type { StateDependencies, StreamChange } from '../types';

export class GroupStream extends StreamActiveRecord<GroupStreamDefinition> {
  constructor(definition: GroupStreamDefinition, dependencies: StateDependencies) {
    super(definition, dependencies);
  }

  clone(): StreamActiveRecord<GroupStreamDefinition> {
    return new GroupStream(cloneDeep(this._definition), this.dependencies);
  }

  protected async doHandleUpsertChange(
    definition: StreamDefinition,
    desiredState: State,
    startingState: State
  ): Promise<{ cascadingChanges: StreamChange[]; changeStatus: StreamChangeStatus }> {
    if (definition.name !== this._definition.name) {
      return {
        changeStatus: this.changeStatus,
        cascadingChanges: [],
      };
    }

    if (!isGroupStreamDefinition(definition)) {
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
      throw new StatusError('A group stream name can not start with [logs.]', 400);
    }

    // validate relationships
    const selfReference = this._definition.group.relationships.find(
      (relationship) => relationship.name === this.name
    );
    if (selfReference) {
      return {
        isValid: false,
        errors: [`Group stream ${this.name} cannot have a relationship to itself`],
      };
    }

    for (const relationship of this._definition.group.relationships) {
      const relatedStream = desiredState.get(relationship.name);
      if (!relatedStream || relatedStream.isDeleted()) {
        return {
          isValid: false,
          errors: [`Related stream ${relationship.name} not found`],
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
          `Group stream ${this.name} cannot reference the same stream twice: ${duplicates.join(
            ','
          )}`,
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
          isGroupStreamDefinition(stream.definition) &&
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
            `Cannot delete group stream ${this.name} because group stream ${stream.name} depends on it`
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
