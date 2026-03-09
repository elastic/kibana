/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { ManagementApp, ManagementAppMountParams } from '@kbn/management-plugin/public';
import {
  INFERENCE_ENDPOINTS_APP_ID,
  MODEL_SETTINGS_APP_ID,
  MODEL_SETTINGS_PLUGIN_TITLE,
  PLUGIN_TITLE,
} from '../common/constants';
import { docLinks } from '../common/doc_links';
import type {
  AppPluginSetupDependencies,
  AppPluginStartDependencies,
  SearchInferenceEndpointsConfigType,
  SearchInferenceEndpointsPluginSetup,
  SearchInferenceEndpointsPluginStart,
} from './types';
import { registerLocators } from './locators';
import { isModelSettingsEnabled } from './feature_flag';

export class SearchInferenceEndpointsPlugin
  implements Plugin<SearchInferenceEndpointsPluginSetup, SearchInferenceEndpointsPluginStart>
{
  private config: SearchInferenceEndpointsConfigType;
  private registeredApp?: ManagementApp;
  private licenseSubscription?: Subscription;
  private isServerless: boolean;
  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<SearchInferenceEndpointsConfigType>();
    this.isServerless = initializerContext.env.packageInfo.buildFlavor === 'serverless';
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
    const isEnabled = isModelSettingsEnabled(core.uiSettings);
    const shouldRegisterModelSettingsApp = this.isServerless
      ? this.config.modelSettingsEnabled && isEnabled
      : isEnabled;
    if (shouldRegisterModelSettingsApp) {
      this.registeredApp = plugins.management.sections.section.machineLearning.registerApp({
        id: MODEL_SETTINGS_APP_ID,
        title: MODEL_SETTINGS_PLUGIN_TITLE,
        order: 2,
        async mount({ element, history }: ManagementAppMountParams) {
          const { renderModelSettingsUIApp } = await import('./model_settings_application');
          const [coreStart, depsStart] = await core.getStartServices();
          const startDeps: AppPluginStartDependencies = {
            ...depsStart,
            history,
          };

          return renderModelSettingsUIApp(coreStart, startDeps, element);
        },
      });
    }

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
