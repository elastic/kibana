/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import type { Streams } from '@kbn/streams-schema';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { TimefilterHook } from '@kbn/data-plugin/public/query/timefilter/use_timefilter';
import type { Condition } from '@kbn/streamlang';
import type { RoutingDefinition } from '@kbn/streams-schema';
import type { RoutingDefinitionWithUIAttributes } from '../../types';
import type { DocumentMatchFilterOptions } from '.';

export interface StreamRoutingServiceDependencies {
  forkSuccessNofitier: (streamName: string) => void;
  refreshDefinition: () => void;
  streamsRepositoryClient: StreamsRepositoryClient;
  timeState$: TimefilterHook['timeState$'];
  core: CoreStart;
  data: DataPublicPluginStart;
}

export interface StreamRoutingInput {
  definition: Streams.WiredStream.GetResponse;
}

export interface StreamRoutingContext {
  currentRuleId: string | null;
  definition: Streams.WiredStream.GetResponse;
  initialRouting: RoutingDefinitionWithUIAttributes[];
  routing: RoutingDefinitionWithUIAttributes[];
}

export type StreamRoutingEvent =
  | { type: 'stream.received'; definition: Streams.WiredStream.GetResponse }
  | { type: 'routingRule.cancel' }
  | { type: 'routingRule.change'; routingRule: Partial<RoutingDefinitionWithUIAttributes> }
  | { type: 'routingRule.create' }
  | { type: 'routingRule.edit'; id: string }
  | { type: 'routingRule.fork' }
  | { type: 'routingRule.reorder'; routing: RoutingDefinitionWithUIAttributes[] }
  | { type: 'routingRule.remove' }
  | { type: 'routingRule.save' }
  | { type: 'routingSamples.setDocumentMatchFilter'; filter: DocumentMatchFilterOptions }
  | { type: 'suggestion.preview'; condition: Condition }
  | { type: 'suggestion.append'; definitions: RoutingDefinition[] };
