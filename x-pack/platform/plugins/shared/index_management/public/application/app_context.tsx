/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type SemVer from 'semver/classes/semver';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type {
  ApplicationStart,
  I18nStart,
  ThemeServiceStart,
  FatalErrorsStart,
  ScopedHistory,
  DocLinksStart,
  ExecutionContextStart,
  HttpSetup,
  IUiSettingsClient,
  OverlayStart,
  ChromeStart,
} from '@kbn/core/public';
import type { MlPluginStart } from '@kbn/ml-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { ConsolePluginStart } from '@kbn/console-plugin/public';
import type { StreamsPluginStart } from '@kbn/streams-plugin/public';
import type { ReindexServicePublicStart } from '@kbn/reindex-service-plugin/public';

import type { EuiBreadcrumb } from '@elastic/eui';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { ExtensionsService } from '../services';
import type { HttpService, NotificationService, UiMetricService } from './services';
import type { IndexManagementBreadcrumb } from './services/breadcrumbs';

export const AppContext = createContext<AppDependencies | undefined>(undefined);

export interface AppDependencies {
  core: {
    fatalErrors: FatalErrorsStart;
    getUrlForApp: ApplicationStart['getUrlForApp'];
    executionContext: ExecutionContextStart;
    application: ApplicationStart;
    http: HttpSetup;
    i18n: I18nStart;
    theme: ThemeServiceStart;
    chrome: ChromeStart;
  };
  plugins: {
    usageCollection: UsageCollectionSetup;
    isFleetEnabled: boolean;
    share: SharePluginStart;
    cloud?: CloudSetup;
    console?: ConsolePluginStart;
    licensing?: LicensingPluginStart;
    ml?: MlPluginStart;
    streams?: StreamsPluginStart;
    reindexService: ReindexServicePublicStart;
  };
  services: {
    uiMetricService: UiMetricService;
    extensionsService: ExtensionsService;
    httpService: HttpService;
    notificationService: NotificationService;
  };
  config: {
    enableIndexActions: boolean;
    enableLegacyTemplates: boolean;
    enableIndexStats: boolean;
    enableSizeAndDocCount: boolean;
    enableDataStreamStats: boolean;
    editableIndexSettings: 'all' | 'limited';
    enableMappingsSourceFieldSection: boolean;
    enableTogglingDataRetention: boolean;
    enableProjectLevelRetentionChecks: boolean;
    enableSemanticText: boolean;
    enforceAdaptiveAllocations: boolean;
    enableFailureStoreRetentionDisabling: boolean;
    isServerless: boolean;
  };
  history: ScopedHistory;
  setBreadcrumbs: (type: IndexManagementBreadcrumb, additionalBreadcrumb?: EuiBreadcrumb) => void;
  uiSettings: IUiSettingsClient;
  settings: SettingsStart;
  url: SharePluginStart['url'];
  docLinks: DocLinksStart;
  kibanaVersion: SemVer;
  overlays: OverlayStart;
  canUseSyntheticSource: boolean;
  privs: {
    monitor: boolean;
    manageEnrich: boolean;
    monitorEnrich: boolean;
    manageIndexTemplates: boolean;
  };
}

const queryClient = new QueryClient({});

export const AppContextProvider = ({
  children,
  value,
}: {
  value: AppDependencies;
  children: React.ReactNode;
}) => {
  return (
    <AppContext.Provider value={value}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </AppContext.Provider>
  );
};

export const AppContextConsumer = AppContext.Consumer;

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('"useAppContext" can only be called inside of AppContext.Provider!');
  }
  return ctx;
};

export const useServices = () => useAppContext().services;
