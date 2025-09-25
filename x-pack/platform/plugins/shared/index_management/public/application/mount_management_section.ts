/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type SemVer from 'semver/classes/semver';
import type { CoreSetup, CoreStart, ScopedHistory } from '@kbn/core/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { ReindexService, ReindexServicePublicStart } from '@kbn/reindex-service-plugin/public';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { IndexManagementAppMountParams } from '@kbn/index-management-shared-types';
import { UIM_APP_NAME } from '../../common/constants';
import { PLUGIN } from '../../common/constants/plugin';
import type { AppDependencies } from './app_context';
import { breadcrumbService } from './services/breadcrumbs';
import { documentationService } from './services/documentation';
import { UiMetricService } from './services';

import { renderApp } from '.';
import { setReindexService, setUiMetricService } from './services/api';
import { notificationService } from './services/notification';
import { httpService } from './services/http';
import type { ExtensionsService } from '../services/extensions_service';
import type { StartDependencies } from '../types';

function initSetup({
  usageCollection,
  reindexService,
  core,
}: {
  core: CoreStart;
  usageCollection: UsageCollectionSetup;
  reindexService: ReindexService;
}) {
  const { http, notifications } = core;

  httpService.setup(http);
  notificationService.setup(notifications);

  const uiMetricService = new UiMetricService(UIM_APP_NAME);
  setUiMetricService(uiMetricService);
  uiMetricService.setup(usageCollection);

  setReindexService(reindexService);

  return { uiMetricService };
}

export function getIndexManagementDependencies({
  core,
  usageCollection,
  extensionsService,
  history,
  isFleetEnabled,
  kibanaVersion,
  config,
  cloud,
  startDependencies,
  uiMetricService,
  canUseSyntheticSource,
  reindexService,
}: {
  core: CoreStart;
  usageCollection: UsageCollectionSetup;
  extensionsService: ExtensionsService;
  history: ScopedHistory<unknown>;
  isFleetEnabled: boolean;
  kibanaVersion: SemVer;
  config: AppDependencies['config'];
  cloud?: CloudSetup;
  startDependencies: StartDependencies;
  uiMetricService: UiMetricService;
  canUseSyntheticSource: boolean;
  reindexService: ReindexServicePublicStart;
}): AppDependencies {
  const { docLinks, application, uiSettings, settings } = core;
  const { url } = startDependencies.share;
  const { monitor, manageEnrich, monitorEnrich, manageIndexTemplates } =
    application.capabilities.index_management;

  return {
    core: {
      getUrlForApp: application.getUrlForApp,
      ...core,
    },
    plugins: {
      usageCollection,
      isFleetEnabled,
      share: startDependencies.share,
      cloud,
      console: startDependencies.console,
      ml: startDependencies.ml,
      streams: startDependencies.streams,
      licensing: startDependencies.licensing,
      reindexService,
    },
    services: {
      httpService,
      notificationService,
      uiMetricService,
      extensionsService,
    },
    config,
    history,
    setBreadcrumbs: breadcrumbService.setBreadcrumbs,
    uiSettings,
    settings,
    url,
    docLinks,
    kibanaVersion,
    overlays: core.overlays,
    canUseSyntheticSource,
    privs: {
      monitor: !!monitor,
      manageEnrich: !!manageEnrich,
      monitorEnrich: !!monitorEnrich,
      manageIndexTemplates: !!manageIndexTemplates,
    },
  };
}

export async function mountManagementSection({
  coreSetup,
  usageCollection,
  params,
  extensionsService,
  isFleetEnabled,
  kibanaVersion,
  config,
  cloud,
  canUseSyntheticSource,
  reindexService,
}: {
  coreSetup: CoreSetup<StartDependencies>;
  usageCollection: UsageCollectionSetup;
  params: IndexManagementAppMountParams;
  extensionsService: ExtensionsService;
  isFleetEnabled: boolean;
  kibanaVersion: SemVer;
  config: AppDependencies['config'];
  cloud?: CloudSetup;
  canUseSyntheticSource: boolean;
  reindexService: ReindexServicePublicStart;
}) {
  const { element, setBreadcrumbs, history } = params;
  const [core, startDependencies] = await coreSetup.getStartServices();
  const {
    docLinks,
    chrome: { docTitle },
  } = core;
  docTitle.change(PLUGIN.getI18nName(i18n));

  breadcrumbService.setup(setBreadcrumbs);
  documentationService.setup(docLinks);

  const { uiMetricService } = initSetup({
    usageCollection,
    core,
    reindexService: reindexService?.reindexService,
  });
  const appDependencies = getIndexManagementDependencies({
    cloud,
    config,
    core,
    extensionsService,
    history,
    isFleetEnabled,
    kibanaVersion,
    startDependencies,
    uiMetricService,
    usageCollection,
    canUseSyntheticSource,
    reindexService,
  });

  const unmountAppCallback = renderApp(element, { core, dependencies: appDependencies });

  return () => {
    docTitle.reset();
    unmountAppCallback();
  };
}
