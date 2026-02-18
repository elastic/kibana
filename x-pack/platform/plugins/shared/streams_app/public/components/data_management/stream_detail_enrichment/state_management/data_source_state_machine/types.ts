/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActorRef, Snapshot } from 'xstate';
import type { IToasts } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SampleDocument } from '@kbn/streams-schema';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import type { StreamsTelemetryClient } from '../../../../../telemetry/client';
import type { EnrichmentDataSourceWithUIAttributes } from '../../types';

export interface DataSourceMachineDeps {
  data: DataPublicPluginStart;
  toasts: IToasts;
  telemetryClient: StreamsTelemetryClient;
  streamsRepositoryClient: StreamsRepositoryClient;
}

export type DataSourceToParentEvent =
  | { type: 'dataSource.change'; id: string }
  | { type: 'dataSource.dataChange'; id: string }
  | { type: 'dataSource.delete'; id: string };

export interface DataSourceInput {
  parentRef: DataSourceParentActor;
  streamName: string;
  streamType: 'wired' | 'classic' | 'unknown';
  dataSource: EnrichmentDataSourceWithUIAttributes;
}

export type DataSourceParentActor = ActorRef<Snapshot<unknown>, DataSourceToParentEvent>;

export type DataSourceSimulationMode = 'partial' | 'complete';

export interface DataSourceContext {
  parentRef: DataSourceParentActor;
  streamName: string;
  streamType: 'wired' | 'classic' | 'unknown';
  dataSource: EnrichmentDataSourceWithUIAttributes;
  data: SampleDocument[];
  simulationMode: DataSourceSimulationMode;
}

export type DataSourceEvent =
  | { type: 'dataSource.change'; dataSource: EnrichmentDataSourceWithUIAttributes }
  | { type: 'dataSource.delete' }
  | { type: 'dataSource.refresh' }
  | { type: 'dataSource.enable' }
  | { type: 'dataSource.disable' };
