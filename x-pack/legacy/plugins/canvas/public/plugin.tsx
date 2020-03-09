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

export { CoreStart };
/**
 * These are the private interfaces for the services your plugin depends on.
 * @internal
 */
// This interface will be built out as we require other plugins for setup
export interface CanvasSetupDeps {
  home: HomePublicPluginSetup;
}
export interface CanvasStartDeps {
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
export interface CanvasSetup {} // eslint-disable-line @typescript-eslint/no-empty-interface
export interface CanvasStart {} // eslint-disable-line @typescript-eslint/no-empty-interface

/** @internal */
export class CanvasPlugin
  implements Plugin<CanvasSetup, CanvasStart, CanvasSetupDeps, CanvasStartDeps> {
  public setup(core: CoreSetup, plugins: CanvasSetupDeps) {
    // This is where any setup actions need to occur.
    // Things like registering functions to the interpreter that need
    // to be available everywhere, not just in Canvas

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

    return {};
  }

  public start(core: CoreStart, plugins: CanvasStartDeps) {
    loadExpressionTypes();
    loadTransitions();

    initLoadingIndicator(core.http.addLoadingCountSource);

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
