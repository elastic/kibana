/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, isEqual } from 'lodash';
import { Streams, validateStreamName } from '@kbn/streams-schema';
import { StatusError } from '../../errors/status_error';
import type { ElasticsearchAction } from '../execution_plan/types';
import type { State } from '../state';
import type {
  StreamChangeStatus,
  StreamChanges,
  ValidationResult,
} from '../stream_active_record/stream_active_record';
import { StreamActiveRecord } from '../stream_active_record/stream_active_record';
import type { StateDependencies, StreamChange } from '../types';

type RemoteStreamChanges = StreamChanges;

export class RemoteStream extends StreamActiveRecord<Streams.RemoteStream.Definition> {
  protected _changes: RemoteStreamChanges = {};

  constructor(definition: Streams.RemoteStream.Definition, dependencies: StateDependencies) {
    super(definition, dependencies);
  }

  protected doClone(): StreamActiveRecord<Streams.RemoteStream.Definition> {
    return new RemoteStream(cloneDeep(this._definition), this.dependencies);
  }

  protected async doHandleUpsertChange(
    definition: Streams.all.Definition,
    _desiredState: State,
    _startingState: State
  ): Promise<{ cascadingChanges: StreamChange[]; changeStatus: StreamChangeStatus }> {
    if (definition.name !== this._definition.name) {
      return { cascadingChanges: [], changeStatus: this.changeStatus };
    }

    if (!Streams.RemoteStream.Definition.is(definition)) {
      throw new StatusError('Cannot change stream types', 400);
    }

    this._definition = definition;

    return { cascadingChanges: [], changeStatus: 'upserted' };
  }

  protected async doHandleDeleteChange(
    target: string,
    _desiredState: State,
    _startingState: State
  ): Promise<{ cascadingChanges: StreamChange[]; changeStatus: StreamChangeStatus }> {
    if (target !== this._definition.name) {
      return { cascadingChanges: [], changeStatus: this.changeStatus };
    }

    return { cascadingChanges: [], changeStatus: 'deleted' };
  }

  protected async doValidateUpsertion(
    desiredState: State,
    _startingState: State
  ): Promise<ValidationResult> {
    const nameValidation = validateStreamName(this._definition.name);
    if (!nameValidation.valid) {
      return { isValid: false, errors: [new Error(nameValidation.message)] };
    }

    const existingStream = desiredState.get(this._definition.name);
    if (existingStream && !Streams.RemoteStream.Definition.is(existingStream.definition)) {
      return {
        isValid: false,
        errors: [
          new Error(
            `Cannot create remote stream: a stream named "${this._definition.name}" already exists as a different type`
          ),
        ],
      };
    }

    return { isValid: true, errors: [] };
  }

  protected async doValidateDeletion(
    _desiredState: State,
    startingState: State
  ): Promise<ValidationResult> {
    const existing = startingState.get(this._definition.name);
    if (!existing) {
      return { isValid: true, errors: [] };
    }

    if (!Streams.RemoteStream.Definition.is(existing.definition)) {
      return {
        isValid: false,
        errors: [
          new Error(
            `Cannot delete as remote stream: stream "${this._definition.name}" is not a remote stream`
          ),
        ],
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

  protected async doDetermineUpdateActions(
    _desiredState: State,
    _startingState: State,
    startingStateStream: RemoteStream
  ): Promise<ElasticsearchAction[]> {
    const definitionChanged = !isEqual(this._definition, startingStateStream.definition);

    if (!definitionChanged) {
      return [];
    }

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
        request: { name: this._definition.name },
      },
      {
        type: 'unlink_assets',
        request: { name: this._definition.name },
      },
      {
        type: 'unlink_features',
        request: { name: this._definition.name },
      },
    ];
  }
}
