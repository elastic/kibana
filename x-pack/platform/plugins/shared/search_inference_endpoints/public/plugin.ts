/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { ManagementApp, ManagementAppMountParams } from '@kbn/management-plugin/public';
import {
  ELASTIC_INFERENCE_SERVICE_APP_ID,
  INFERENCE_ENDPOINTS_APP_ID,
  MODEL_SETTINGS_APP_ID,
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

export class SearchInferenceEndpointsPlugin
  implements Plugin<SearchInferenceEndpointsPluginSetup, SearchInferenceEndpointsPluginStart>
{
  private config: SearchInferenceEndpointsConfigType;
  private registerInferenceEndpoints?: ManagementApp;
  private registerModelSettings?: ManagementApp;
  private registerElasticInferenceService?: ManagementApp;
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

    this.registerInferenceEndpoints =
      plugins.management.sections.section.modelManagement.registerApp({
        id: INFERENCE_ENDPOINTS_APP_ID,
        title: i18n.translate('xpack.searchInferenceEndpoints.externalInferenceTitle', {
          defaultMessage: 'External Inference',
        }),
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

    this.registerModelSettings = plugins.management.sections.section.modelManagement.registerApp({
      id: MODEL_SETTINGS_APP_ID,
      title: i18n.translate('xpack.searchInferenceEndpoints.modelSettingsTitle', {
        defaultMessage: 'Feature Settings',
      }),
      order: 3,
      async mount({ element, history }: ManagementAppMountParams) {
        const { renderSettingsMgmtApp } = await import('./application');
        const [coreStart, depsStart] = await core.getStartServices();
        const startDeps: AppPluginStartDependencies = {
          ...depsStart,
          history,
        };

        return renderSettingsMgmtApp(coreStart, startDeps, element);
      },
    });

    this.registerElasticInferenceService =
      plugins.management.sections.section.modelManagement.registerApp({
        id: ELASTIC_INFERENCE_SERVICE_APP_ID,
        title: i18n.translate('xpack.searchInferenceEndpoints.elasticInferenceServiceTitle', {
          defaultMessage: 'Elastic Inference',
        }),
        order: 1,
        async mount({ element, history }: ManagementAppMountParams) {
          const { renderElasticInferenceServiceApp } = await import(
            './elastic_inference_service_application'
          );
          const [coreStart, depsStart] = await core.getStartServices();
          const startDeps: AppPluginStartDependencies = {
            ...depsStart,
            history,
          };

          return renderElasticInferenceServiceApp(coreStart, startDeps, element);
        },
      });

    this.registerInferenceEndpoints.disable();
    this.registerModelSettings.disable();
    this.registerElasticInferenceService.disable();

    return {};
  }

  public start(
    core: CoreStart,
    { licensing }: AppPluginStartDependencies
  ): SearchInferenceEndpointsPluginStart {
    docLinks.setDocLinks(core.docLinks.links);

    this.licenseSubscription = licensing.license$.subscribe((license) => {
      const hasEnterpriseLicense = license?.hasAtLeast('enterprise');
      const hasAccess =
        core.application.capabilities.management?.modelManagement?.inference_endpoints === true;

      if (hasEnterpriseLicense && hasAccess) {
        this.registerInferenceEndpoints?.enable();
        this.registerModelSettings?.enable();
        this.registerElasticInferenceService?.enable();
      } else {
        this.registerInferenceEndpoints?.disable();
        this.registerModelSettings?.disable();
        this.registerElasticInferenceService?.disable();
      }
    });

    return {};
  }

  public stop() {
    this.licenseSubscription?.unsubscribe();
  }
}
