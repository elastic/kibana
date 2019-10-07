/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// legacy imports currently necessary to power Graph
// for a cutover all of these have to be resolved
import 'uiExports/fieldFormats';
import 'uiExports/savedObjectTypes';
import 'ui/autoload/all';
import 'ui/kbn_top_nav';
import 'ui/directives/saved_object_finder';
import 'ui/directives/input_focus';
import 'ui/saved_objects/ui/saved_object_save_as_checkbox';
import 'uiExports/autocompleteProviders';
import chrome from 'ui/chrome';
import { fatalError } from 'ui/notify';
// @ts-ignore
import { KbnUrlProvider } from 'ui/url';
// @ts-ignore
import { SavedObjectsClientProvider } from 'ui/saved_objects';
import { SavedObjectRegistryProvider } from 'ui/saved_objects/saved_object_registry';
// @ts-ignore
import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';
import { IPrivate } from 'ui/private';

// NP type imports
import { CoreSetup } from 'src/core/public';
import { DataSetup } from 'src/legacy/core_plugins/data/public';
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
    savedWorkspacesClient: Private(SavedWorkspacesProvider),
    savedGraphWorkspaces: injector.get('savedGraphWorkspaces'),
    savedObjectsClient: Private(SavedObjectsClientProvider),
    savedObjectRegistry: Private(SavedObjectRegistryProvider),
    canEditDrillDownUrls: chrome.getInjected('canEditDrillDownUrls'),
    graphSavePolicy: chrome.getInjected('graphSavePolicy'),
  };
}

export interface GraphPluginSetupDependencies {
  data: DataSetup;
}

export class GraphPlugin {
  setup(core: CoreSetup, { data }: GraphPluginSetupDependencies) {
    core.application.register({
      id: 'graph',
      title: 'Graph',
      async mount(context, params) {
        const { renderApp } = await import('./render_app');
        const angularDependencies = await getAngularInjectedDependencies();
        return renderApp(
          context,
          {
            ...params,
            data,
            fatalError,
            xpackInfo,
            KbnUrlProvider,
            addBasePath: core.http.basePath.prepend,
            getBasePath: core.http.basePath.get,
          },
          angularDependencies
        );
      },
    });
  }

  start() {}

  stop() {}
}
