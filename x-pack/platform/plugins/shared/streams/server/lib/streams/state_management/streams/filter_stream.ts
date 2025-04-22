/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  conditionToQueryDsl,
  isChildOf,
  isFilterStreamDefinition,
  isWiredStreamDefinition,
} from '@kbn/streams-schema';
import type { FilterStreamDefinition, StreamDefinition } from '@kbn/streams-schema';
import { cloneDeep } from 'lodash';
import { isNotFoundError } from '@kbn/es-errors';
import { StatusError } from '../../errors/status_error';
import type { ElasticsearchAction } from '../execution_plan/types';
import type { State } from '../state';
import type {
  StreamChangeStatus,
  ValidationResult,
} from '../stream_active_record/stream_active_record';
import { StreamActiveRecord } from '../stream_active_record/stream_active_record';
import type { StreamChange } from '../types';

export class FilterStream extends StreamActiveRecord<FilterStreamDefinition> {
  clone(): StreamActiveRecord<FilterStreamDefinition> {
    return new FilterStream(cloneDeep(this._definition), this.dependencies);
  }

  protected async doHandleUpsertChange(
    definition: StreamDefinition,
    desiredState: State,
    startingState: State
  ): Promise<{ cascadingChanges: StreamChange[]; changeStatus: StreamChangeStatus }> {
    if (definition.name !== this.name) {
      return { cascadingChanges: [], changeStatus: this.changeStatus };
    }

    if (!isFilterStreamDefinition(definition)) {
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
    if (target !== this.name) {
      if (target === this._definition.filter.source) {
        // If the source is deleted but the FilterStream isn't, we need to run validation to stop that change
        return { cascadingChanges: [], changeStatus: 'upserted' };
      }
      return { cascadingChanges: [], changeStatus: this.changeStatus };
    }

    return { cascadingChanges: [], changeStatus: 'deleted' };
  }

  protected async doValidateUpsertion(
    desiredState: State,
    startingState: State
  ): Promise<ValidationResult> {
    const sourceStream = desiredState.get(this._definition.filter.source);

    if (!sourceStream) {
      return {
        isValid: false,
        errors: [
          `Cannot attach FilterStream ${this.name} to non-existent source stream ${this._definition.filter.source}`,
        ],
      };
    }

    if (!isWiredStreamDefinition(sourceStream.definition)) {
      return {
        isValid: false,
        errors: [
          `Cannot attach FilterStream ${this.name} to source stream ${this._definition.filter.source} since it is not a WiredStream`,
        ],
      };
    }

    if (sourceStream.isDeleted()) {
      return {
        isValid: false,
        errors: [
          `Cannot delete source stream ${this._definition.filter.source} since FilterStream ${this.name} depends on it`,
        ],
      };
    }

    const startingStateStream = startingState.get(this.name);
    if (startingStateStream && isFilterStreamDefinition(startingStateStream.definition)) {
      const sourceHasChanged =
        (startingStateStream.definition as FilterStreamDefinition).filter.source !==
        this._definition.filter.source;
      if (sourceHasChanged) {
        return {
          isValid: false,
          errors: [`Cannot change source for FilterStream ${this.name}`],
        };
      }
    }

    // Check for conflicts
    if (!startingStateStream) {
      try {
        const dataStreamResponse =
          await this.dependencies.scopedClusterClient.asCurrentUser.indices.getDataStream({
            name: this._definition.name,
          });

        if (dataStreamResponse.data_streams.length === 0) {
          return {
            isValid: false,
            errors: [
              `Cannot create FilterStream ${this._definition.name} due to conflict caused by existing index`,
            ],
          };
        }

        return {
          isValid: false,
          errors: [
            `Cannot create FilterStream ${this._definition.name} due to conflict caused by existing data stream`,
          ],
        };
      } catch (error) {
        if (!isNotFoundError(error)) {
          throw error;
        }
      }

      try {
        await this.dependencies.scopedClusterClient.asCurrentUser.indices.getAlias({
          name: this.name,
        });

        return {
          isValid: false,
          errors: [
            `Cannot create FilterStream ${this._definition.name} due to conflict caused by existing alias`,
          ],
        };
      } catch (error) {
        if (!isNotFoundError(error)) {
          throw error;
        }
      }
    }

    if (!isChildOf(this._definition.filter.source, this.name)) {
      return {
        isValid: false,
        errors: [
          `FilterStream ${this.name} is not a child of its source stream ${this._definition.filter.source}`,
        ],
      };
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
        type: 'update_alias',
        name: this.name,
        add: [this._definition.filter.source],
        remove: [],
        filter: conditionToQueryDsl(this._definition.filter.filter),
      },
      {
        type: 'upsert_dot_streams_document',
        request: this._definition,
      },
    ];
  }

  protected async doDetermineUpdateActions(
    desiredState: State,
    startingState: State,
    startingStateStream: StreamActiveRecord<FilterStreamDefinition>
  ): Promise<ElasticsearchAction[]> {
    const filterHasChanged =
      startingStateStream.definition.filter.filter !== this._definition.filter.filter;

    if (!filterHasChanged) {
      return [];
    }

    return [
      {
        type: 'update_alias',
        name: this.name,
        add: [this._definition.filter.source],
        remove: [],
        filter: conditionToQueryDsl(this._definition.filter.filter),
      },
      {
        type: 'upsert_dot_streams_document',
        request: this._definition,
      },
    ];
  }

  protected async doDetermineDeleteActions(): Promise<ElasticsearchAction[]> {
    return [
      {
        type: 'update_alias',
        name: this.name,
        remove: [this._definition.filter.source],
        add: [],
        filter: conditionToQueryDsl(this._definition.filter.filter),
      },
      {
        type: 'delete_dot_streams_document',
        request: {
          name: this.name,
        },
      },
    ];
  }
}
