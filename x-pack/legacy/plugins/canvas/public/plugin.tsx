/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Chrome } from 'ui/chrome';
import { i18n } from '@kbn/i18n';
import { CoreSetup, CoreStart, Plugin } from '../../../../../src/core/public';
import { HomePublicPluginSetup } from '../../../../../src/plugins/home/public';
// @ts-ignore: Untyped Local
import { CapabilitiesStrings } from '../i18n';
const { ReadOnlyBadge: strings } = CapabilitiesStrings;

import { createStore } from './store';

// @ts-ignore: untyped local component
import { HelpMenu } from './components/help_menu/help_menu';
// @ts-ignore: untyped local
import { loadExpressionTypes } from './lib/load_expression_types';
// @ts-ignore: untyped local
import { loadTransitions } from './lib/load_transitions';
import { initLoadingIndicator } from './lib/loading_indicator';
import { getDocumentationLinks } from './lib/documentation_links';

// @ts-ignore: untyped local
import { initClipboard } from './lib/clipboard';
import { featureCatalogueEntry } from './feature_catalogue_entry';
import { ExpressionsSetup, ExpressionsStart } from '../../../../../src/plugins/expressions/public';
// @ts-ignore untyped local
import { datasourceSpecs } from './expression_types/datasources';
// @ts-ignore untyped local
import { argTypeSpecs } from './expression_types/arg_types';
import { transitions } from './transitions';
import { registerLanguage } from './lib/monaco_language_def';

import { initInterpreter } from './lib/run_interpreter';
import { legacyRegistries } from './legacy_plugin_support';
import { getPluginApi, CanvasApi, SetupRegistries } from './plugin_api';
import {
  initRegistries,
  addElements,
  addTransformUIs,
  addDatasourceUIs,
  addModelUIs,
  addViewUIs,
  addArgumentUIs,
  addTagUIs,
  addTemplates,
  addTransitions,
} from './registries';

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
  __LEGACY: {
    absoluteToParsedUrl: (url: string, basePath: string) => any;
    formatMsg: any;
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
export interface CanvasStart {} // eslint-disable-line @typescript-eslint/no-empty-interface

/** @internal */
export class CanvasPlugin
  implements Plugin<CanvasSetup, CanvasStart, CanvasSetupDeps, CanvasStartDeps> {
  private expressionSetup: CanvasSetupDeps['expressions'] | undefined;
  private registries: SetupRegistries | undefined;

  public setup(core: CoreSetup<CanvasStartDeps>, plugins: CanvasSetupDeps) {
    const { api: canvasApi, registries } = getPluginApi(plugins.expressions);
    this.registries = registries;

    core.application.register({
      id: 'canvas',
      title: 'Canvas App',
      async mount(context, params) {
        // Load application bundle
        const { renderApp } = await import('./application');

        // Setup our store
        const canvasStore = await createStore(core, plugins);

        // Get start services
        const [coreStart, depsStart] = await core.getStartServices();

        return renderApp(coreStart, depsStart, params, canvasStore);
      },
    });

    plugins.home.featureCatalogue.register(featureCatalogueEntry);
    this.expressionSetup = plugins.expressions;

    // Register Legacy plugin stuff
    canvasApi.addFunctions(legacyRegistries.browserFunctions.getOriginalFns());
    canvasApi.addElements(legacyRegistries.elements.getOriginalFns());

    // TODO: Do we want to completely move canvas_plugin_src into it's own plugin?
    const srcPlugin = new CanvasSrcPlugin();
    srcPlugin.setup(core, { canvas: canvasApi });

    // Register core canvas stuff
    canvasApi.addFunctions(initFunctions({ typesRegistry: plugins.expressions.__LEGACY.types }));
    canvasApi.addDatasourceUIs(datasourceSpecs);
    canvasApi.addArgumentUIs(argTypeSpecs);
    canvasApi.addTransitions(transitions);

    return {
      ...canvasApi,
    };
  }

  public start(core: CoreStart, plugins: CanvasStartDeps) {
    initLoadingIndicator(core.http.addLoadingCountSource);
    initRegistries();

    if (this.expressionSetup) {
      const expressionSetup = this.expressionSetup;
      initInterpreter(plugins.expressions, expressionSetup).then(() => {
        registerLanguage(Object.values(plugins.expressions.getFunctions()));
      });
    }

    if (this.registries) {
      addElements(this.registries.elements);
      addTransformUIs(this.registries.transformUIs);
      addDatasourceUIs(this.registries.datasourceUIs);
      addModelUIs(this.registries.modelUIs);
      addViewUIs(this.registries.viewUIs);
      addArgumentUIs(this.registries.argumentUIs);
      addTemplates(this.registries.templates);
      addTagUIs(this.registries.tagUIs);
      addTransitions(this.registries.transitions);
    } else {
      throw new Error('Unable to initialize Canvas registries');
    }

    core.chrome.setBadge(
      core.application.capabilities.canvas && core.application.capabilities.canvas.save
        ? undefined
        : {
            text: strings.getText(),
            tooltip: strings.getTooltip(),
            iconType: 'glasses',
          }
    );

    core.chrome.setHelpExtension({
      appName: i18n.translate('xpack.canvas.helpMenu.appName', {
        defaultMessage: 'Canvas',
      }),
      links: [
        {
          linkType: 'documentation',
          href: getDocumentationLinks().canvas,
        },
      ],
      content: domNode => () => {
        ReactDOM.render(<HelpMenu />, domNode);
      },
    });

    return {};
  }
}
