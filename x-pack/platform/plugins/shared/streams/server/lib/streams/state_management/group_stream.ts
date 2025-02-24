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
import { StreamActiveRecord, ValidationResult } from './types';

export class GroupStream implements StreamActiveRecord {
  definition: GroupStreamDefinition;

  constructor(definition: GroupStreamDefinition) {
    // What about the assets?
    this.definition = definition;
  }

  clone(): StreamActiveRecord {
    return new GroupStream(cloneDeep(this.definition));
  }

  markForDeletion(): void {
    // Mark as deleted
  }

  update(newDefinition: StreamDefinition) {
    if (isGroupStreamDefinition(newDefinition)) {
      this.definition = newDefinition;
      // Mark as changed
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
}
