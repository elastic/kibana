/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { i18n } from '@kbn/i18n';

import type { ClientConfigType } from '../types';
import { httpService } from './services/http';
import type { UiMetricService } from './services';
import { breadcrumbService, docTitleService } from './services/navigation';
import type { AppDependencies } from './app_context';
import { renderApp } from '.';

export async function mountManagementSection(
  coreSetup: CoreSetup,
  services: {
    uiMetricService: UiMetricService;
  },
  config: ClientConfigType,
  params: ManagementAppMountParams
) {
  const { element, setBreadcrumbs, history } = params;
  const [core] = await coreSetup.getStartServices();
  const {
    chrome: { docTitle },
    settings,
  } = core;

  docTitleService.setup(docTitle.change);
  breadcrumbService.setup(setBreadcrumbs);

  const appDependencies: AppDependencies = {
    core,
    config,
    services: {
      uiSettings: coreSetup.uiSettings,
      settings,
      httpService,
      uiMetricService: services.uiMetricService,
      i18n,
      history,
    },
  };

  const unmountAppCallback = renderApp(element, appDependencies);

  return () => {
    docTitle.reset();
    unmountAppCallback();
  };
}
