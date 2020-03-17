/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject } from 'rxjs';
import { CoreSetup, CoreStart, Plugin, AppUpdater } from '../../../../../src/core/public';
import { HomePublicPluginSetup } from '../../../../../src/plugins/home/public';
import { initLoadingIndicator } from './lib/loading_indicator';
// @ts-ignore untyped local
import { historyProvider } from './lib/history_provider';
import { featureCatalogueEntry } from './feature_catalogue_entry';
import { ExpressionsSetup, ExpressionsStart } from '../../../../../src/plugins/expressions/public';
import { createKbnUrlTracker } from '../../../../../src/plugins/kibana_utils/public';

// @ts-ignore untyped local
import { argTypeSpecs } from './expression_types/arg_types';
import { transitions } from './transitions';
import { legacyRegistries } from './legacy_plugin_support';
import { getPluginApi, CanvasApi } from './plugin_api';
import { initFunctions } from './functions';
import { CanvasSrcPlugin } from '../canvas_plugin_src/plugin';
export { CoreStart };

/**
 * These are the private interfaces for the services your plugin depends on.
 * @internal
 */
// This interface will be built out as we require other plugins for setup
export interface CanvasSetupDeps {
  expressions: ExpressionsSetup;
  home: HomePublicPluginSetup;
}

export interface CanvasStartDeps {
  expressions: ExpressionsStart;
}

/**
 * These are the interfaces with your public contracts. You should export these
 * for other plugins to use in _their_ `SetupDeps`/`StartDeps` interfaces.
 * @public
 */
// These interfaces are empty for now but will be populate as we need to export
// things for other plugins to use at startup or runtime
export type CanvasSetup = CanvasApi;
export interface CanvasStart {} // eslint-disable-line @typescript-eslint/no-empty-interface

/** @internal */
export class CanvasPlugin
  implements Plugin<CanvasSetup, CanvasStart, CanvasSetupDeps, CanvasStartDeps> {
  private appUpdater = new BehaviorSubject<AppUpdater>(() => ({}));

  public setup(core: CoreSetup<CanvasStartDeps>, plugins: CanvasSetupDeps) {
    const { api: canvasApi, registries } = getPluginApi(plugins.expressions);

    const { appMounted, appUnMounted, setActiveUrl } = createKbnUrlTracker({
      baseUrl: core.http.basePath.prepend('/app/kibana/canvas'),
      defaultSubUrl: `#/`,
      storageKey: 'lastUrl:canvas',
      navLinkUpdater$: this.appUpdater,
      toastNotifications: core.notifications.toasts,
      stateParams: [],
    });

    core.application.register({
      id: 'canvas',
      title: 'Canvas App',
      updater$: this.appUpdater,
      async mount(context, params) {
        // Load application bundle
        const { renderApp, initializeCanvas, teardownCanvas } = await import('./application');

        // Get start services
        const [coreStart, depsStart] = await core.getStartServices();

        // Tell URL tracker we've mounted the app
        appMounted();

        const canvasStore = await initializeCanvas(core, coreStart, plugins, depsStart, registries);

        const unmount = renderApp(coreStart, depsStart, params, canvasStore, setActiveUrl);

        return () => {
          unmount();

          // Tell URL tracker we're unmounting the app
          appUnMounted();

          teardownCanvas(coreStart);
        };
      },
    });

    plugins.home.featureCatalogue.register(featureCatalogueEntry);

    // Register Legacy plugin stuff
    canvasApi.addFunctions(legacyRegistries.browserFunctions.getOriginalFns());
    canvasApi.addElements(legacyRegistries.elements.getOriginalFns());
    canvasApi.addTypes(legacyRegistries.types.getOriginalFns());

    // TODO: Do we want to completely move canvas_plugin_src into it's own plugin?
    const srcPlugin = new CanvasSrcPlugin();
    srcPlugin.setup(core, { canvas: canvasApi });

    // Register core canvas stuff
    canvasApi.addFunctions(initFunctions({ typesRegistry: plugins.expressions.__LEGACY.types }));
    canvasApi.addArgumentUIs(argTypeSpecs);
    canvasApi.addTransitions(transitions);

    return {
      ...canvasApi,
    };
  }

  public start(core: CoreStart, plugins: CanvasStartDeps) {
    initLoadingIndicator(core.http.addLoadingCountSource);

    return {};
  }
}
