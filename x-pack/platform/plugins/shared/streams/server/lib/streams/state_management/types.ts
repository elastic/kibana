/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient, Logger } from '@kbn/core/server';
import { StreamDefinition, WiredStreamUpsertRequest } from '@kbn/streams-schema';
import { State } from './state'; // Does this create a circular dependency?
import { StreamsStorageClient } from '../service';

export interface ValidationResult {
  isValid: boolean;
  errors: string[]; // Or Errors?
}

export type StreamChangeStatus = 'unchanged' | 'upserted' | 'deleted';
export type StreamCommitStatus = 'uncomitted' | 'committing' | 'committed';

// Interface or abstract class to make somethings private?
// Should all of these methods be async from the start?
export interface StreamActiveRecord {
  definition: StreamDefinition;
  changeStatus: StreamChangeStatus;
  commitStatus: StreamCommitStatus;
  clone(): StreamActiveRecord;
  markForDeletion(desiredState: State, startingState: State): void;
  update(newDefinition: StreamDefinition, desiredState: State, startingState: State): void;
  validate(
    desiredState: State,
    startingState: State,
    scopedClusterClient: IScopedClusterClient
  ): Promise<ValidationResult>;
  commit(
    storageClient: StreamsStorageClient,
    logger: Logger,
    scopedClusterClient: IScopedClusterClient,
    isServerless: boolean
  ): Promise<void>;
}

interface WiredStreamUpsertChange {
  target: string;
  type: 'wired_upsert';
  request: WiredStreamUpsertRequest & {
    stream: {
      name: string;
    };
  };
}

interface StreamDeleteChange {
  target: string;
  type: 'delete';
}

export type StreamChange = WiredStreamUpsertChange | StreamDeleteChange;
