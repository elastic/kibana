/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  HttpStart,
  IUiSettingsClient,
  NotificationsStart,
  UserProfileService,
} from '@kbn/core/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { UnifiedDocViewerStart } from '@kbn/unified-doc-viewer-plugin/public';

/** The services a subject row reads. Every entry is optional: without one the row degrades. */
export interface SubjectServices {
  /** Locators that resolve a subject's details page; without it a subject keeps its own link. */
  share?: Pick<SharePluginStart, 'url'>;
  http?: HttpStart;
  uiSettings?: IUiSettingsClient;
  userProfile?: UserProfileService;
  notifications?: NotificationsStart;
  charts?: ChartsPluginStart;
  data?: DataPublicPluginStart;
  dataViews?: DataViewsPublicPluginStart;
  expressions?: ExpressionsStart;
  spaces?: SpacesPluginStart;
  unifiedDocViewer?: UnifiedDocViewerStart;
}

/** The services the alerting v2 episode flyout requires, all present. */
export type EpisodeFlyoutServices = SubjectServices &
  Required<
    Pick<
      SubjectServices,
      | 'http'
      | 'uiSettings'
      | 'userProfile'
      | 'notifications'
      | 'charts'
      | 'data'
      | 'dataViews'
      | 'expressions'
      | 'spaces'
      | 'unifiedDocViewer'
    >
  >;

export type SubjectFlyoutServices = SubjectServices;

/**
 * Whether the episode flyout can render: it takes eight services, and a deployment that does not
 * start one of them (for example `spaces`) keeps the plain link instead.
 */
export const hasEpisodeFlyoutServices = (
  services: SubjectServices
): services is EpisodeFlyoutServices =>
  Boolean(
    services.http &&
      services.uiSettings &&
      services.userProfile &&
      services.notifications &&
      services.charts &&
      services.data &&
      services.dataViews &&
      services.expressions &&
      services.spaces &&
      services.unifiedDocViewer
  );

/**
 * Whether an alert subject can open a flyout instead of navigating: an alerting v2 episode needs
 * the episode flyout's services, a classic alert only needs `http`. Lives here, not next to the
 * flyout, so a row can ask without loading the flyout's bundle.
 */
export const canOpenSubjectFlyout = (services: SubjectServices, alertVersion?: string): boolean =>
  alertVersion === 'v2' ? hasEpisodeFlyoutServices(services) : services.http !== undefined;
