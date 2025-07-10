/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Subject } from 'rxjs';
import SemVer from 'semver/classes/semver';

import {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  ScopedHistory,
  Capabilities,
} from '@kbn/core/public';
import {
  ComponentTemplateFlyoutProps,
  DatastreamFlyoutProps,
  IndexManagementPluginSetup,
  IndexManagementPluginStart,
  IndexMappingProps,
  IndexSettingProps,
  IndexTemplateFlyoutProps,
} from '@kbn/index-management-shared-types';
import {
  IndexManagementLocator,
  IndexManagementAppMountParams,
} from '@kbn/index-management-shared-types';
import { Subscription } from 'rxjs';
import React from 'react';
import { setExtensionsService } from './application/store/selectors/extension_service';
import { ExtensionsService } from './services/extensions_service';

import { ClientConfigType, SetupDependencies, StartDependencies } from './types';

// avoid import from index files in plugin.ts, use specific import paths
import { PLUGIN } from '../common/constants/plugin';
import { IndexMapping } from './application/sections/home/index_list/details_page/with_context_components/index_mappings_embeddable';
import { PublicApiService } from './services/public_api_service';
import { IndexSettings } from './application/sections/home/index_list/details_page/with_context_components/index_settings_embeddable';
import { IndexManagementLocatorDefinition } from './locator';
import { ComponentTemplateFlyout } from './application/components/component_templates/component_templates_flyout_embeddable';
import { DataStreamFlyout } from './application/sections/home/data_stream_list/data_stream_detail_panel/data_stream_flyout_embeddable';
import { IndexTemplateFlyout } from './application/sections/home/template_list/template_details/index_template_flyout_embeddable';

export class IndexMgmtUIPlugin
  implements
    Plugin<
      IndexManagementPluginSetup,
      IndexManagementPluginStart,
      SetupDependencies,
      StartDependencies
    >
{
  private extensionsService = new ExtensionsService();
  private locator?: IndexManagementLocator;
  private kibanaVersion: SemVer;
  private config: {
    enableIndexActions: boolean;
    enableLegacyTemplates: boolean;
    enableIndexStats: boolean;
    enableDataStreamStats: boolean;
    enableSizeAndDocCount: boolean;
    editableIndexSettings: 'all' | 'limited';
    isIndexManagementUiEnabled: boolean;
    enableMappingsSourceFieldSection: boolean;
    enableTogglingDataRetention: boolean;
    enableProjectLevelRetentionChecks: boolean;
    enableSemanticText: boolean;
    enforceAdaptiveAllocations: boolean;
  };
  private canUseSyntheticSource: boolean = false;
  private licensingSubscription?: Subscription;

  private capabilities$ = new Subject<Capabilities>();

  constructor(ctx: PluginInitializerContext) {
    // Temporary hack to provide the service instances in module files in order to avoid a big refactor
    // For the selectors we should expose them through app dependencies and read them from there on each container component.
    setExtensionsService(this.extensionsService);
    this.kibanaVersion = new SemVer(ctx.env.packageInfo.version);
    const {
      ui: { enabled: isIndexManagementUiEnabled },
      enableIndexActions,
      enableLegacyTemplates,
      enableIndexStats,
      enableDataStreamStats,
      enableSizeAndDocCount,
      editableIndexSettings,
      enableMappingsSourceFieldSection,
      enableTogglingDataRetention,
      enableProjectLevelRetentionChecks,
      dev: { enableSemanticText },
    } = ctx.config.get<ClientConfigType>();
    this.config = {
      isIndexManagementUiEnabled,
      enableIndexActions: enableIndexActions ?? true,
      enableLegacyTemplates: enableLegacyTemplates ?? true,
      enableIndexStats: enableIndexStats ?? true,
      enableDataStreamStats: enableDataStreamStats ?? true,
      enableSizeAndDocCount: enableSizeAndDocCount ?? false,
      editableIndexSettings: editableIndexSettings ?? 'all',
      enableMappingsSourceFieldSection: enableMappingsSourceFieldSection ?? true,
      enableTogglingDataRetention: enableTogglingDataRetention ?? true,
      enableProjectLevelRetentionChecks: enableProjectLevelRetentionChecks ?? false,
      enableSemanticText: enableSemanticText ?? true,
      enforceAdaptiveAllocations: ctx.env.packageInfo.buildFlavor === 'serverless',
    };
  }

  public setup(
    coreSetup: CoreSetup<StartDependencies>,
    plugins: SetupDependencies
  ): IndexManagementPluginSetup {
    const { fleet, usageCollection, management, cloud } = plugins;

    this.capabilities$.subscribe((capabilities) => {
      const { monitor, manageEnrich, monitorEnrich, manageIndexTemplates } =
        capabilities.index_management;
      if (
        this.config.isIndexManagementUiEnabled &&
        (monitor || manageEnrich || monitorEnrich || manageIndexTemplates)
      ) {
        management.sections.section.data.registerApp({
          id: PLUGIN.id,
          title: i18n.translate('xpack.idxMgmt.appTitle', { defaultMessage: 'Index Management' }),
          order: 0,
          mount: async (params) => {
            const { mountManagementSection } = await import(
              './application/mount_management_section'
            );
            return mountManagementSection({
              coreSetup,
              usageCollection,
              params,
              extensionsService: this.extensionsService,
              isFleetEnabled: Boolean(fleet),
              kibanaVersion: this.kibanaVersion,
              config: this.config,
              cloud,
              canUseSyntheticSource: this.canUseSyntheticSource,
            });
          },
        });
      }
    });

    this.locator = plugins.share.url.locators.create(
      new IndexManagementLocatorDefinition({
        managementAppLocator: plugins.management.locator,
      })
    );

    return {
      apiService: new PublicApiService(coreSetup.http),
      extensionsService: this.extensionsService.setup(),
      renderIndexManagementApp: async (params: IndexManagementAppMountParams) => {
        const { mountManagementSection } = await import('./application/mount_management_section');
        return mountManagementSection({
          coreSetup,
          usageCollection,
          params,
          extensionsService: this.extensionsService,
          isFleetEnabled: Boolean(fleet),
          kibanaVersion: this.kibanaVersion,
          config: this.config,
          cloud,
          canUseSyntheticSource: this.canUseSyntheticSource,
        });
      },
      locator: this.locator,
    };
  }

  private buildComponentDependencies(
    core: CoreStart,
    plugins: StartDependencies,
    deps: { history: ScopedHistory<unknown> }
  ) {
    const { fleet, usageCollection, cloud, share, console, ml, licensing } = plugins;
    const { docLinks, fatalErrors, application, uiSettings, executionContext, settings, http } =
      core;
    const { monitor, manageEnrich, monitorEnrich, manageIndexTemplates } =
      application.capabilities.index_management;
    const { url } = share;
    const dependencies = {
      core: {
        fatalErrors,
        getUrlForApp: application.getUrlForApp,
        executionContext,
        application,
        http,
        i18n: core.i18n,
        theme: core.theme,
        chrome: core.chrome,
      },
      plugins: {
        usageCollection,
        isFleetEnabled: Boolean(fleet),
        share,
        cloud,
        console,
        ml,
        licensing,
      },
      services: {
        extensionsService: this.extensionsService,
      },
      config: this.config,
      history: deps.history,
      canUseSyntheticSource: this.canUseSyntheticSource,
      overlays: core.overlays,
      privs: {
        monitor: !!monitor,
        manageEnrich: !!manageEnrich,
        monitorEnrich: !!monitorEnrich,
        manageIndexTemplates: !!manageIndexTemplates,
      },
      setBreadcrumbs: () => {},
      uiSettings,
      settings,
      url,
      docLinks,
      kibanaVersion: this.kibanaVersion,
      theme$: core.theme.theme$,
    };
    return { dependencies, core, usageCollection };
  }

  public start(coreStart: CoreStart, plugins: StartDependencies): IndexManagementPluginStart {
    const { licensing } = plugins;

    this.capabilities$.next(coreStart.application.capabilities);

    this.licensingSubscription = licensing?.license$.subscribe((next) => {
      this.canUseSyntheticSource = next.hasAtLeast('enterprise');
    });
    return {
      extensionsService: this.extensionsService.setup(),
      getIndexMappingComponent: (deps: { history: ScopedHistory<unknown> }) => {
        return (props: IndexMappingProps) => {
          return IndexMapping({
            ...this.buildComponentDependencies(coreStart, plugins, deps),
            ...props,
          });
        };
      },
      getIndexSettingsComponent: (deps: { history: ScopedHistory<unknown> }) => {
        return (props: IndexSettingProps) => {
          return React.createElement(IndexSettings, {
            ...this.buildComponentDependencies(coreStart, plugins, deps),
            ...props,
          });
        };
      },
      getComponentTemplateFlyoutComponent: (deps: { history: ScopedHistory<unknown> }) => {
        return (props: ComponentTemplateFlyoutProps) => {
          return React.createElement(ComponentTemplateFlyout, {
            ...this.buildComponentDependencies(coreStart, plugins, deps),
            ...props,
          });
        };
      },
      getIndexTemplateFlyoutComponent: (deps: { history: ScopedHistory<unknown> }) => {
        return (props: IndexTemplateFlyoutProps) => {
          return React.createElement(IndexTemplateFlyout, {
            ...this.buildComponentDependencies(coreStart, plugins, deps),
            ...props,
          });
        };
      },
      getDatastreamFlyoutComponent: (deps: { history: ScopedHistory<unknown> }) => {
        return (props: DatastreamFlyoutProps) => {
          return React.createElement(DataStreamFlyout, {
            ...this.buildComponentDependencies(coreStart, plugins, deps),
            ...props,
          });
        };
      },
    };
  }
  public stop() {
    this.licensingSubscription?.unsubscribe();
  }
}
