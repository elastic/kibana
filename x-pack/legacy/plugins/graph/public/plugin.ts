/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// LP type imports
import { IPrivate } from 'ui/private';

// NP type imports
import { CoreSetup, CoreStart } from 'src/core/public';
import { DataStart } from 'src/legacy/core_plugins/data/public';
import { Plugin as DataPlugin } from 'src/plugins/data/public';

// legacy imports currently necessary to power Graph
// for a cutover all of these have to be resolved
import 'uiExports/fieldFormats';
import 'uiExports/savedObjectTypes';
import 'uiExports/autocompleteProviders';
import 'ui/autoload/all';
import chrome from 'ui/chrome';
import { fatalError } from 'ui/notify';
// @ts-ignore
import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';
import { Storage } from 'ui/storage';
// @ts-ignore
import { SavedObjectsClientProvider } from 'ui/saved_objects';
// @ts-ignore
import { SavedObjectRegistryProvider } from 'ui/saved_objects/saved_object_registry';
// @ts-ignore
import { SavedWorkspacesProvider } from './angular/services/saved_workspaces';

/**
 * Get dependencies relying on the global angular context.
 * They also have to get resolved together with the legacy imports above
 */
async function getAngularInjectedDependencies() {
  const injector = await chrome.dangerouslyGetActiveInjector();

  const Private = injector.get<IPrivate>('Private');

  return {
    $http: injector.get('$http'),
    confirmModal: injector.get('confirmModal'),
    savedObjectRegisty: Private(SavedObjectRegistryProvider),
    kbnBaseUrl: injector.get('kbnBaseUrl'),
    savedGraphWorkspaces: Private(SavedWorkspacesProvider),
    savedObjectsClient: Private(SavedObjectsClientProvider),
    savedObjectRegistry: Private(SavedObjectRegistryProvider),
    canEditDrillDownUrls: chrome.getInjected('canEditDrillDownUrls'),
    graphSavePolicy: chrome.getInjected('graphSavePolicy'),
  };
}

export interface GraphPluginStartDependencies {
  data: DataStart;
  npData: ReturnType<DataPlugin['start']>;
}

export class GraphPlugin {
  private dataStart: DataStart | null = null;
  private npDataStart: ReturnType<DataPlugin['start']> | null = null;

  setup(core: CoreSetup) {
    core.application.register({
      id: 'graph',
      title: 'Graph',
      order: 9000,
      icon: 'plugins/graph/icon.png',
      euiIconType: 'graphApp',
      mount: async (context, params) => {
        const { renderApp } = await import('./render_app');
        const angularDependencies = await getAngularInjectedDependencies();
        return renderApp(
          context,
          {
            ...params,
            data: this.dataStart!,
            npData: this.npDataStart!,
            fatalError,
            xpackInfo,
            addBasePath: core.http.basePath.prepend,
            getBasePath: core.http.basePath.get,
            Storage,
          },
          angularDependencies
        );
      },
    });
  }

  start(_core: CoreStart, { data, npData }: GraphPluginStartDependencies) {
    // TODO is this really the right way? I though the app context would give us those
    this.dataStart = data;
    this.npDataStart = npData;
  }

  stop() {}
}
