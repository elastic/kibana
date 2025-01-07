/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import SemVer from 'semver/classes/semver';
import { CoreSetup, CoreStart, ScopedHistory } from '@kbn/core/public';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { CloudSetup } from '@kbn/cloud-plugin/public';
import { UIM_APP_NAME } from '../../common/constants';
import { PLUGIN } from '../../common/constants/plugin';
import { AppDependencies } from './app_context';
import { breadcrumbService } from './services/breadcrumbs';
import { documentationService } from './services/documentation';
import { UiMetricService } from './services';

import { renderApp } from '.';
import { setUiMetricService } from './services/api';
import { notificationService } from './services/notification';
import { httpService } from './services/http';
import { ExtensionsService } from '../services/extensions_service';
import { StartDependencies } from '../types';

function initSetup({
  usageCollection,
  core,
}: {
  core: CoreStart;
  usageCollection: UsageCollectionSetup;
}) {
  const { http, notifications } = core;

  httpService.setup(http);
  notificationService.setup(notifications);

  const uiMetricService = new UiMetricService(UIM_APP_NAME);

  setUiMetricService(uiMetricService);

  uiMetricService.setup(usageCollection);

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
      licensing: startDependencies.licensing,
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
}: {
  coreSetup: CoreSetup<StartDependencies>;
  usageCollection: UsageCollectionSetup;
  params: ManagementAppMountParams;
  extensionsService: ExtensionsService;
  isFleetEnabled: boolean;
  kibanaVersion: SemVer;
  config: AppDependencies['config'];
  cloud?: CloudSetup;
  canUseSyntheticSource: boolean;
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
  });

  const unmountAppCallback = renderApp(element, { core, dependencies: appDependencies });

  return () => {
    docTitle.reset();
    unmountAppCallback();
  };
}
