/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActorRef, Snapshot } from 'xstate5';
import { IToasts } from '@kbn/core/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { SampleDocument } from '@kbn/streams-schema';
import { EnrichmentDataSourceWithUIAttributes } from '../../types';

export interface DataSourceMachineDeps {
  data: DataPublicPluginStart;
  toasts: IToasts;
}

export type DataSourceToParentEvent =
  | { type: 'dataSource.change'; id: string }
  | { type: 'dataSource.dataChange'; id: string }
  | { type: 'dataSource.delete'; id: string };

export interface DataSourceInput {
  parentRef: DataSourceParentActor;
  streamName: string;
  dataSource: EnrichmentDataSourceWithUIAttributes;
}

export type DataSourceParentActor = ActorRef<Snapshot<unknown>, DataSourceToParentEvent>;

export interface DataSourceContext {
  parentRef: DataSourceParentActor;
  streamName: string;
  dataSource: EnrichmentDataSourceWithUIAttributes;
  data: SampleDocument[];
  uiAttributes: {
    color: string;
  };
}

export type DataSourceEvent =
  | { type: 'dataSource.change'; dataSource: EnrichmentDataSourceWithUIAttributes }
  | { type: 'dataSource.delete' }
  | { type: 'dataSource.refresh' }
  | { type: 'dataSource.toggleActivity' };
