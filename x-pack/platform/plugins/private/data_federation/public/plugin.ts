/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { ManagementApp, ManagementAppMountParams } from '@kbn/management-plugin/public';
import type { SetupDependencies, StartDependencies, DataFederationPluginStart } from './types';
import { MINIMUM_LICENSE_TYPE, PLUGIN_ID, PLUGIN_NAME } from '../common';
import { buildFederatedIdentityClusterInfo } from './create_data_source_flyout/federated_identity_cluster_info';

const LIST_BREADCRUMB = [
  {
    text: PLUGIN_NAME,
    href: '#/management/kibana/data_federation',
  },
];

export class DataFederationPlugin
  implements Plugin<void, DataFederationPluginStart, SetupDependencies, StartDependencies>
{
  private readonly enabled: boolean;
  private readonly enableFederatedIdentityAuth: boolean;
  private readonly enableGoogleCloudStorageDataSourceType: boolean;
  private readonly enableAzureDataSourceType: boolean;

  private readonly workloadIdentityIssuerUrl: string | undefined;

  private registeredApp?: ManagementApp;
  private licenseSubscription?: Subscription;

  constructor(initializerContext: PluginInitializerContext) {
    const {
      enabled,
      enableFederatedIdentityAuth,
      enableGoogleCloudStorageDataSourceType,
      enableAzureDataSourceType,
      workloadIdentityIssuerUrl,
    } = initializerContext.config.get<{
      enabled: boolean;
      enableFederatedIdentityAuth: boolean;
      enableGoogleCloudStorageDataSourceType: boolean;
      enableAzureDataSourceType: boolean;
      workloadIdentityIssuerUrl?: string;
    }>();
    this.enabled = enabled;
    this.enableFederatedIdentityAuth = enableFederatedIdentityAuth;
    this.enableGoogleCloudStorageDataSourceType = enableGoogleCloudStorageDataSourceType;
    this.enableAzureDataSourceType = enableAzureDataSourceType;
    this.workloadIdentityIssuerUrl = workloadIdentityIssuerUrl;
  }

  public setup(core: CoreSetup<StartDependencies>, { management, cloud }: SetupDependencies): void {
    if (!this.enabled) {
      return;
    }

    const enableFederatedIdentityAuth = this.enableFederatedIdentityAuth;
    const enableGoogleCloudStorageDataSourceType = this.enableGoogleCloudStorageDataSourceType;
    const enableAzureDataSourceType = this.enableAzureDataSourceType;
    const cloudInfo = buildFederatedIdentityClusterInfo(cloud, this.workloadIdentityIssuerUrl);
    const isCloudEnabled = Boolean(cloud?.isCloudEnabled);
    this.registeredApp = management.sections.section.data.registerApp({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      order: 2,
      visibleIn: ['globalSearch', 'projectSideNav'],
      async mount(params: ManagementAppMountParams) {
        const { mountManagementSection } = await import('./mount_management_section');
        const [nextCoreStart, { share }] = await core.getStartServices();

        const { docTitle } = nextCoreStart.chrome;
        docTitle.change(PLUGIN_NAME);

        const { setBreadcrumbs } = params;
        setBreadcrumbs(LIST_BREADCRUMB);

        const unmountAppCallback = mountManagementSection(nextCoreStart, params, {
          cloudInfo,
          isCloudEnabled,
          share,
          featureFlags: {
            enableFederatedIdentityAuth,
            enableGoogleCloudStorageDataSourceType,
            enableAzureDataSourceType,
          },
        });
        return () => {
          docTitle.reset();
          unmountAppCallback();
        };
      },
    });

    this.registeredApp.disable();
  }

  public start(coreStart: CoreStart, { licensing }: StartDependencies): DataFederationPluginStart {
    const canManageFederatedData =
      coreStart.application.capabilities?.[PLUGIN_ID]?.manageFederatedData === true;

    if (!this.registeredApp || !canManageFederatedData) {
      return {};
    }

    this.licenseSubscription = licensing.license$.subscribe((license) => {
      if (license.check(PLUGIN_ID, MINIMUM_LICENSE_TYPE).state === 'valid') {
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
