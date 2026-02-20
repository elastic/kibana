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
import type { StreamsTelemetryClient } from '../../../../../telemetry/client';
import type { RoutingDefinitionWithUIAttributes } from '../../types';
import type { DocumentMatchFilterOptions } from '.';
import type { RoutingSamplesContext } from './routing_samples_state_machine';
import type { PartitionSuggestion } from '../../review_suggestions_form/use_review_suggestions_form';

export interface StreamRoutingServiceDependencies {
  forkSuccessNofitier: (streamName: string) => void;
  refreshDefinition: () => void;
  streamsRepositoryClient: StreamsRepositoryClient;
  timeState$: TimefilterHook['timeState$'];
  core: CoreStart;
  data: DataPublicPluginStart;
  telemetryClient: StreamsTelemetryClient;
}

export interface StreamRoutingInput {
  definition: Streams.WiredStream.GetResponse;
}

export interface StreamRoutingContext {
  currentRuleId: string | null;
  definition: Streams.WiredStream.GetResponse;
  initialRouting: RoutingDefinitionWithUIAttributes[];
  routing: RoutingDefinitionWithUIAttributes[];
  suggestedRuleId: string | null;
  editingSuggestionIndex: number | null;
  editedSuggestion: PartitionSuggestion | null;
  isRefreshing: boolean;
}

export type StreamRoutingEvent =
  | { type: 'childStreams.mode.changeToIngestMode' }
  | { type: 'childStreams.mode.changeToQueryMode' }
  | { type: 'queryStream.create' }
  | { type: 'queryStream.cancel' }
  | { type: 'queryStream.save'; name: string; esqlQuery: string }
  | { type: 'routingRule.cancel' }
  | { type: 'routingRule.change'; routingRule: Partial<RoutingDefinitionWithUIAttributes> }
  | { type: 'routingRule.create' }
  | { type: 'routingRule.edit'; id: string }
  | { type: 'routingRule.fork'; routingRule?: RoutingDefinition }
  | { type: 'routingRule.reorder'; routing: RoutingDefinitionWithUIAttributes[] }
  | { type: 'routingRule.remove' }
  | { type: 'routingRule.save' }
  | { type: 'routingSamples.setDocumentMatchFilter'; filter: DocumentMatchFilterOptions }
  | { type: 'routingSamples.setSelectedPreview'; preview: RoutingSamplesContext['selectedPreview'] }
  | {
      type: 'suggestion.preview';
      condition: Condition;
      name: string;
      index: number;
      toggle?: boolean;
    }
  | { type: 'routingRule.reviewSuggested'; id: string }
  | { type: 'stream.received'; definition: Streams.WiredStream.GetResponse }
  | { type: 'suggestion.edit'; index: number; suggestion: PartitionSuggestion }
  | { type: 'suggestion.changeName'; name: string }
  | { type: 'suggestion.changeCondition'; condition: Condition }
  | { type: 'suggestion.saveSuggestion' };
