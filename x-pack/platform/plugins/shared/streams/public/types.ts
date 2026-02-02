/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin as PluginClass } from '@kbn/core/public';
import type { Observable } from 'rxjs';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { StreamsRepositoryClient } from './api';
import type { StreamsPublicConfig } from '../common/config';
import type { EnableStreamsResponse, DisableStreamsResponse } from '../server/lib/streams/client';

export interface StreamsNavigationStatus {
  status: 'enabled' | 'disabled';
}

export interface WiredStreamsStatus {
  enabled: boolean | 'conflict' | 'unknown';
  can_manage: boolean;
}

export interface ClassicStreamsStatus {
  can_manage: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StreamsPluginSetup {}

export interface StreamsPluginStart {
  streamsRepositoryClient: StreamsRepositoryClient;
  navigationStatus$: Observable<StreamsNavigationStatus>;
  getWiredStatus: () => Promise<WiredStreamsStatus>;
  getClassicStatus: () => Promise<ClassicStreamsStatus>;
  enableWiredMode: (signal: AbortSignal) => Promise<EnableStreamsResponse>;
  disableWiredMode: (signal: AbortSignal) => Promise<DisableStreamsResponse>;
  config$: Observable<StreamsPublicConfig>;
}

export interface StreamsPluginSetupDependencies {
  cloud?: CloudSetup;
}

export interface StreamsPluginStartDependencies {
  cloud?: CloudStart;
  spaces?: SpacesPluginStart;
}

export type StreamsPluginClass = PluginClass<
  StreamsPluginSetup,
  StreamsPluginStart,
  StreamsPluginSetupDependencies,
  StreamsPluginStartDependencies
>;
