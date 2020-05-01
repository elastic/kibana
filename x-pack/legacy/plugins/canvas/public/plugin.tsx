/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Chrome } from 'ui/chrome';
import { CoreSetup, CoreStart, Plugin } from '../../../../../src/core/public';
import { HomePublicPluginSetup } from '../../../../../src/plugins/home/public';
import { initLoadingIndicator } from './lib/loading_indicator';
import { featureCatalogueEntry } from './feature_catalogue_entry';
import { ExpressionsSetup, ExpressionsStart } from '../../../../../src/plugins/expressions/public';
import { DataPublicPluginSetup } from '../../../../../src/plugins/data/public';
import { UiActionsStart } from '../../../../../src/plugins/ui_actions/public';
import { EmbeddableStart } from '../../../../../src/plugins/embeddable/public';
import { UsageCollectionSetup } from '../../../../../src/plugins/usage_collection/public';
import { Start as InspectorStart } from '../../../../../src/plugins/inspector/public';
// @ts-ignore untyped local
import { argTypeSpecs } from './expression_types/arg_types';
import { transitions } from './transitions';
import { legacyRegistries } from './legacy_plugin_support';
import { getPluginApi, CanvasApi } from './plugin_api';
import { initFunctions } from './functions';
import { CanvasSrcPlugin } from '../canvas_plugin_src/plugin';
export { CoreStart, CoreSetup };

/**
 * These are the private interfaces for the services your plugin depends on.
 * @internal
 */
// This interface will be built out as we require other plugins for setup
export interface CanvasSetupDeps {
  data: DataPublicPluginSetup;
  expressions: ExpressionsSetup;
  home: HomePublicPluginSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface CanvasStartDeps {
  embeddable: EmbeddableStart;
  expressions: ExpressionsStart;
  inspector: InspectorStart;

  uiActions: UiActionsStart;
  __LEGACY: {
    absoluteToParsedUrl: (url: string, basePath: string) => any;
    trackSubUrlForApp: Chrome['trackSubUrlForApp'];
  };
}

/**
 * These are the interfaces with your public contracts. You should export these
 * for other plugins to use in _their_ `SetupDeps`/`StartDeps` interfaces.
 * @public
 */
// These interfaces are empty for now but will be populate as we need to export
// things for other plugins to use at startup or runtime
export type CanvasSetup = CanvasApi;
export type CanvasStart = void;

/** @internal */
export class CanvasPlugin
  implements Plugin<CanvasSetup, CanvasStart, CanvasSetupDeps, CanvasStartDeps> {
  // TODO: Do we want to completely move canvas_plugin_src into it's own plugin?
  private srcPlugin = new CanvasSrcPlugin();
  private startPlugins: CanvasStartDeps | undefined;

  public setup(core: CoreSetup<CanvasStartDeps>, plugins: CanvasSetupDeps) {
    const { api: canvasApi, registries } = getPluginApi(plugins.expressions);

    this.srcPlugin.setup(core, { canvas: canvasApi });

    core.application.register({
      id: 'canvas',
      title: 'Canvas App',
      mount: async (context, params) => {
        // Load application bundle
        const { renderApp, initializeCanvas, teardownCanvas } = await import('./application');

        // Get start services
        const [coreStart, depsStart] = await core.getStartServices();

        // TODO: We only need this to get the __LEGACY stuff that isn't coming from getStartSevices.
        // We won't need this as soon as we move over to NP Completely
        if (!this.startPlugins) {
          throw new Error('Start Plugins not ready at mount time');
        }

        const canvasStore = await initializeCanvas(
          core,
          coreStart,
          plugins,
          this.startPlugins,
          registries
        );

        const unmount = renderApp(coreStart, depsStart, params, canvasStore);

        return () => {
          unmount();
          teardownCanvas(coreStart, depsStart);
        };
      },
    });

    plugins.home.featureCatalogue.register(featureCatalogueEntry);

    // Register Legacy plugin stuff
    canvasApi.addFunctions(legacyRegistries.browserFunctions.getOriginalFns());
    canvasApi.addElements(legacyRegistries.elements.getOriginalFns());
    canvasApi.addTypes(legacyRegistries.types.getOriginalFns());

    // Register core canvas stuff
    canvasApi.addFunctions(
      initFunctions({
        timefilter: plugins.data.query.timefilter.timefilter,
        prependBasePath: core.http.basePath.prepend,
        typesRegistry: plugins.expressions.__LEGACY.types,
      })
    );
    canvasApi.addArgumentUIs(argTypeSpecs);
    canvasApi.addTransitions(transitions);

    return {
      ...canvasApi,
    };
  }

  public start(core: CoreStart, plugins: CanvasStartDeps) {
    this.startPlugins = plugins;
    this.srcPlugin.start(core, plugins);
    initLoadingIndicator(core.http.addLoadingCountSource);
  }
}
