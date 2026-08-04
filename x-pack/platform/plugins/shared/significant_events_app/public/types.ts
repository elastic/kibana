/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { SignificantEventsPublicPluginStart } from '@kbn/significant-events-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { StreamsPluginStart } from '@kbn/streams-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type React from 'react';
import type { Observable } from 'rxjs';

export type KnowledgeIndicatorsPanelComponent = React.ComponentType<{ streamName: string }>;

export interface SignificantEventsAppSetupDependencies {
  share: SharePluginSetup;
}

export interface SignificantEventsAppStartDependencies {
  charts: ChartsPluginStart;
  data: DataPublicPluginStart;
  licensing: LicensingPluginStart;
  share: SharePluginStart;
  significant_events: SignificantEventsPublicPluginStart;
  streams: StreamsPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  agentBuilder?: AgentBuilderPluginStart;
  cloud?: CloudStart;
  spaces?: SpacesPluginStart;
}

/* eslint-disable-next-line @typescript-eslint/no-empty-interface */
export interface SignificantEventsAppPublicSetup {}

export interface SignificantEventsAppPublicStart {
  /**
   * Client-side composite gate: rollout feature flag × Enterprise license × pricing
   * tier. Created once at plugin start and multicast — every flag evaluation POSTs a
   * usage counter, so consumers must subscribe to this single instance instead of
   * recreating the observable.
   */
  availability$: Observable<boolean>;
  /**
   * Factory for the embeddable Knowledge Indicators panel used in streams_app's
   * stream overview. Call once per render tree; the returned component carries
   * its own QueryClient and KibanaContext so no extra wrapping is needed.
   */
  getKnowledgeIndicatorsPanel: () => KnowledgeIndicatorsPanelComponent;
}
