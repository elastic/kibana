/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { WiredStreamGetResponse } from '@kbn/streams-schema';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { RoutingDefinitionWithUIAttributes } from '../../types';

export interface StreamRoutingServiceDependencies {
  refreshDefinition: () => void;
  streamsRepositoryClient: StreamsRepositoryClient;
  core: CoreStart;
  data: DataPublicPluginStart;
}

export interface StreamRoutingInput {
  definition: WiredStreamGetResponse;
}

export interface StreamRoutingContext {
  definition: WiredStreamGetResponse;
  initialRouting: RoutingDefinitionWithUIAttributes[];
  routing: RoutingDefinitionWithUIAttributes[];
}

export type StreamRoutingEvent =
  | { type: 'stream.received'; definition: WiredStreamGetResponse }
  | { type: 'stream.reset' }
  | { type: 'stream.update' };
