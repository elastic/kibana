/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GroupStreamDefinition,
  StreamDefinition,
  isGroupStreamDefinition,
} from '@kbn/streams-schema';
import { cloneDeep } from 'lodash';
import { IScopedClusterClient } from '@kbn/core/server';
import { State } from './state';
import {
  StreamActiveRecord,
  StreamChangeStatus,
  StreamCommitStatus,
  ValidationResult,
} from './types';

export class GroupStream implements StreamActiveRecord {
  definition: GroupStreamDefinition;
  changeStatus: StreamChangeStatus;
  commitStatus: StreamCommitStatus;

  constructor(definition: GroupStreamDefinition) {
    // What about the assets?
    this.definition = definition;
    this.changeStatus = 'unchanged';
    this.commitStatus = 'uncomitted';
  }

  clone(): StreamActiveRecord {
    return new GroupStream(cloneDeep(this.definition));
  }

  markForDeletion(): void {
    this.changeStatus = 'deleted';
  }

  update(newDefinition: StreamDefinition): void {
    if (isGroupStreamDefinition(newDefinition)) {
      this.definition = newDefinition; // Perhaps it should avoid this if the definition are the same?
      this.changeStatus = 'upserted';
    } else {
      throw new Error('Cannot apply this change');
    }
  }

  async validate(
    desiredState: State,
    startingState: State,
    scopedClusterClient: IScopedClusterClient
  ): Promise<ValidationResult> {
    return { isValid: true, errors: [] };
  }

  async commit(): Promise<void> {
    return;
  }
}
