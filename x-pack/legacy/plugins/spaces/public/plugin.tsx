/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { HomePublicPluginSetup } from 'src/plugins/home/public';
import { ManagementSetup } from 'src/legacy/core_plugins/management/public';
import { ManagementStart } from 'src/plugins/management/public';
import { SpacesManager } from './spaces_manager';
import { initSpacesNavControl } from './nav_control';
import { createSpacesFeatureCatalogueEntry } from './create_feature_catalogue_entry';
import { CopySavedObjectsToSpaceService } from './copy_saved_objects_to_space';
import { AdvancedSettingsService } from './advanced_settings';
import { ManagementService } from './management';

export interface SpacesPluginStart {
  spacesManager: SpacesManager | null;
}

export interface PluginsSetup {
  home?: HomePublicPluginSetup;
  management: ManagementSetup;
  __managementLegacyCompat: {
    registerSettingsComponent: (
      id: string,
      component: string | React.FC<any>,
      allowOverride: boolean
    ) => void;
  };
}

export interface PluginsStart {
  management: ManagementStart;
}

export class SpacesPlugin implements Plugin<void, SpacesPluginStart, PluginsSetup> {
  private spacesManager!: SpacesManager;

  private managementService?: ManagementService;

  public setup(core: CoreSetup, plugins: PluginsSetup) {
    const serverBasePath = core.injectedMetadata.getInjectedVar('serverBasePath') as string;
    this.spacesManager = new SpacesManager(serverBasePath, core.http);

    const copySavedObjectsToSpaceService = new CopySavedObjectsToSpaceService();
    copySavedObjectsToSpaceService.setup({
      spacesManager: this.spacesManager,
      managementSetup: plugins.management,
    });

    const advancedSettingsService = new AdvancedSettingsService();
    advancedSettingsService.setup({
      getActiveSpace: () => this.spacesManager.getActiveSpace(),
      registerSettingsComponent: plugins.__managementLegacyCompat.registerSettingsComponent,
    });

    if (plugins.home) {
      plugins.home.featureCatalogue.register(createSpacesFeatureCatalogueEntry());
    }
  }

  public start(core: CoreStart, plugins: PluginsStart) {
    initSpacesNavControl(this.spacesManager, core);

    this.managementService = new ManagementService();
    this.managementService.start({ managementStart: plugins.management });

    return {
      spacesManager: this.spacesManager,
    };
  }

  public stop() {
    if (this.managementService) {
      this.managementService.stop();
      this.managementService = undefined;
    }
  }
}
