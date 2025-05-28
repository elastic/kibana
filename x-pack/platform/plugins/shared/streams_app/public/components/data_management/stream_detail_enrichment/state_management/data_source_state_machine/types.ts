/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataSourceDefinition } from '@kbn/streams-schema';
import { ActorRef, Snapshot } from 'xstate5';
import { DataSourceDefinitionWithUIAttributes } from '../../types';

export type DataSourceToParentEvent =
  | { type: 'dataSource.toggle'; id: string }
  | { type: 'dataSource.delete'; id: string }
  | { type: 'dataSource.stage' }
  | { type: 'dataSource.update' };

export interface DataSourceInput {
  parentRef: DataSourceParentActor;
  dataSource: DataSourceDefinitionWithUIAttributes;
  isNew?: boolean;
}

export type DataSourceParentActor = ActorRef<Snapshot<unknown>, DataSourceToParentEvent>;

export interface DataSourceContext {
  parentRef: DataSourceParentActor;
  previousDataSource: DataSourceDefinitionWithUIAttributes;
  dataSource: DataSourceDefinitionWithUIAttributes;
  isNew: boolean;
  isUpdated?: boolean;
}

export type DataSourceEvent =
  | { type: 'dataSource.cancel' }
  | { type: 'dataSource.change'; dataSource: DataSourceDefinition }
  | { type: 'dataSource.delete' }
  | { type: 'dataSource.edit' }
  | { type: 'dataSource.stage' }
  | { type: 'dataSource.update' };

export interface DataSourceEmittedEvent {
  type: 'dataSource.changesDiscarded';
}
