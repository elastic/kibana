/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { ManagementApp, ManagementAppMountParams } from '@kbn/management-plugin/public';
import { INFERENCE_ENDPOINTS_APP_ID, PLUGIN_TITLE } from '../common/constants';
import { docLinks } from '../common/doc_links';
import type {
  AppPluginSetupDependencies,
  AppPluginStartDependencies,
  SearchInferenceEndpointsConfigType,
  SearchInferenceEndpointsPluginSetup,
  SearchInferenceEndpointsPluginStart,
} from './types';
import { registerLocators } from './locators';

export class SearchInferenceEndpointsPlugin
  implements Plugin<SearchInferenceEndpointsPluginSetup, SearchInferenceEndpointsPluginStart>
{
  private config: SearchInferenceEndpointsConfigType;
  private registeredApp?: ManagementApp;
  private licenseSubscription?: Subscription;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<SearchInferenceEndpointsConfigType>();
  }

  public setup(
    core: CoreSetup<AppPluginStartDependencies, SearchInferenceEndpointsPluginStart>,
    plugins: AppPluginSetupDependencies
  ): SearchInferenceEndpointsPluginSetup {
    if (!this.config.ui?.enabled) return {};

    registerLocators(plugins.share);

    this.registeredApp = plugins.management.sections.section.machineLearning.registerApp({
      id: INFERENCE_ENDPOINTS_APP_ID,
      title: PLUGIN_TITLE,
      order: 2,
      async mount({ element, history }: ManagementAppMountParams) {
        const { renderInferenceEndpointsMgmtApp } = await import('./application');
        const [coreStart, depsStart] = await core.getStartServices();
        const startDeps: AppPluginStartDependencies = {
          ...depsStart,
          history,
        };

        return renderInferenceEndpointsMgmtApp(coreStart, startDeps, element);
      },
    });

    this.registeredApp.disable();

    return {};
  }

  public start(
    core: CoreStart,
    { licensing }: AppPluginStartDependencies
  ): SearchInferenceEndpointsPluginStart {
    docLinks.setDocLinks(core.docLinks.links);

    this.licenseSubscription = licensing.license$.subscribe((license) => {
      const hasEnterpriseLicense = license?.hasAtLeast('enterprise');
      const hasAccess = core.application.capabilities.management?.ml?.inference_endpoints === true;

      if (hasEnterpriseLicense && hasAccess) {
        this.registeredApp?.enable();
      } else {
        this.registeredApp?.disable();
      }
    });

    return {};
  }

  public stop() {
    this.licenseSubscription?.unsubscribe();
  }
}
