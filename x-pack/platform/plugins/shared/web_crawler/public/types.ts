/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import type { KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template';

export interface WebCrawlerSetupDependencies {
  workflowsExtensions?: WorkflowsExtensionsPublicPluginSetup;
}

export interface WebCrawlerStartDependencies {
  share: SharePluginStart;
}

export type WebCrawlerServices = CoreStart & WebCrawlerStartDependencies;

interface WebCrawlerHostProps {
  /**
   * Prefixes the `data-telemetry-id` of every element the crawler renders, so each host keeps its
   * own telemetry namespace, e.g. `searchHomepage`.
   */
  telemetryPrefix: string;
  /** Prefixes the localStorage key that remembers the last crawl started from the panel. */
  storageKeyPrefix: string;
}

/** Where the form shows the fields besides the URL: beside it, or behind one disclosure. */
export type WebCrawlOptionsDisplay = 'inline' | 'collapsed';

export interface WebCrawlPanelProps extends WebCrawlerHostProps {
  /** Opens the host's route for `WebCrawlsPage`. Omit it to leave the panel without that link. */
  onManageWebCrawls?: () => void;
  /**
   * `collapsed` leaves only the URL in view, for hosts with little room, and keeps the limits,
   * path rules and targets behind an "Advanced options" disclosure. Defaults to `inline`.
   */
  optionsDisplay?: WebCrawlOptionsDisplay;
}

export interface WebCrawlsPageProps extends WebCrawlerHostProps {
  /** The host's classic-navigation side nav, for hosts rendered under the classic chrome style. */
  solutionNav?: KibanaPageTemplateProps['solutionNav'];
  /** Returns to the host's home page, for the page's back link. */
  onNavigateHome?: () => void;
}

export type WebCrawlerConfig = WebCrawlPanelProps & Pick<WebCrawlsPageProps, 'solutionNav'>;

export interface WebCrawlerPublicStart {
  /** The form that crawls a website into an index, with the status of the last crawl it started. */
  WebCrawlPanel: FC<WebCrawlPanelProps>;
  /** Lists running and past crawls, and starts, stops and schedules them. */
  WebCrawlsPage: FC<WebCrawlsPageProps>;
}
