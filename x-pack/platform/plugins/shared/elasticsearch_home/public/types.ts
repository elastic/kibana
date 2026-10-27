/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import type { IconType } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template';

export interface ElasticsearchHomeStartDependencies {
  agentBuilder: AgentBuilderPluginStart;
  share: SharePluginStart;
  cloud?: CloudStart;
}

export type ElasticsearchHomeServices = CoreStart &
  ElasticsearchHomeStartDependencies & {
    isServerless: boolean;
  };

export interface HomeAddDataLink {
  key: string;
  iconType: IconType;
  label: string;
  onClick: () => void;
  testSubj?: string;
  /** Complete `data-telemetry-id` value. Host-supplied links are not prefixed for the host. */
  telemetryId: string;
}

export interface HomeBannerConfig {
  title: string;
  description: string;
  buttonLabel: string;
  onGetStarted: () => void;
}

export interface HomeDocsLink {
  href: string;
  label: string;
}

/** Fully-resolved config: optional host props replaced by the generic Elasticsearch defaults. */
export type ResolvedHomeConfig = ElasticsearchHomePageProps &
  Required<Pick<ElasticsearchHomePageProps, 'docsLink' | 'ideSetup'>>;

export interface HomeIdeSetup {
  /** Shown in the "View prompt" modal and copied to the clipboard. */
  prompt: string;
  /** First message sent when the user opens the Elastic Agent chat. */
  agentInitialMessage: string;
  /** Session tag for that chat, so each host's conversations stay distinguishable. */
  agentSessionTag: string;
}

export interface ElasticsearchHomePageProps {
  /**
   * Prefixes the `data-telemetry-id` of every element this page owns, so each host keeps its own
   * telemetry namespace, e.g. `serverlessVectordb-home`.
   */
  telemetryPrefix: string;
  /**
   * Prefixes the localStorage keys backing banner and new-index dismissal, so hosts do not share
   * dismissal state, e.g. `vectordb.home`.
   */
  storageKeyPrefix: string;
  /** Defaults to the Elasticsearch search docs. */
  docsLink?: HomeDocsLink;
  /** Defaults to a product-neutral Elasticsearch prompt. */
  ideSetup?: HomeIdeSetup;
  banner?: HomeBannerConfig;
  /**
   * Shown in an info icon next to the Data card's title, e.g. to explain that the stats include
   * data streams. Omit it to show no icon.
   */
  dataCardTooltip?: string;
  /** The "Add data" entries, in display order. */
  addDataLinks: HomeAddDataLink[];
  /** The host's classic-navigation side nav, for hosts rendered under the classic chrome style. */
  solutionNav?: KibanaPageTemplateProps['solutionNav'];
}

export interface ElasticsearchHomePublicStart {
  HomePage: FC<ElasticsearchHomePageProps>;
}
