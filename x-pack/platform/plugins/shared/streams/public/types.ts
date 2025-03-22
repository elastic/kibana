/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin as PluginClass } from '@kbn/core/public';
import { Observable } from 'rxjs';
import { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { StreamsRepositoryClient } from './api';

export interface StreamsPluginSetup {
  status$: Observable<{ status: 'unknown' | 'enabled' | 'disabled' }>;
}

export interface StreamsPluginStart {
  streamsRepositoryClient: StreamsRepositoryClient;
  status$: Observable<{ status: 'unknown' | 'enabled' | 'disabled' }>;
}

export interface StreamsPluginSetupDependencies {
  cloud?: CloudSetup;
}

export interface StreamsPluginStartDependencies {
  cloud?: CloudStart;
}

export type StreamsPluginClass = PluginClass<
  StreamsPluginSetup,
  StreamsPluginStart,
  StreamsPluginSetupDependencies,
  StreamsPluginStartDependencies
>;
