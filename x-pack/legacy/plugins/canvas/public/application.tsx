/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Store } from 'redux';
import ReactDOM from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { Provider } from 'react-redux';

import { AppMountParameters, CoreStart, CoreSetup } from 'kibana/public';

import { CanvasStartDeps, CanvasSetupDeps } from './plugin';
// @ts-ignore Untyped local
import { App } from './components/app';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import { initInterpreter, resetInterpreter } from './lib/run_interpreter';
import { registerLanguage } from './lib/monaco_language_def';
import { SetupRegistries } from './plugin_api';
import { initRegistries, populateRegistries, destroyRegistries } from './registries';
import { getDocumentationLinks } from './lib/documentation_links';
// @ts-ignore untyped component
import { HelpMenu } from './components/help_menu/help_menu';
import { createStore } from './store';

import { CapabilitiesStrings } from '../i18n';
const { ReadOnlyBadge: strings } = CapabilitiesStrings;

export const renderApp = (
  coreStart: CoreStart,
  plugins: CanvasStartDeps,
  { element }: AppMountParameters,
  canvasStore: Store
) => {
  ReactDOM.render(
    <KibanaContextProvider services={{ ...plugins, ...coreStart }}>
      <I18nProvider>
        <Provider store={canvasStore}>
          <App />
        </Provider>
      </I18nProvider>
    </KibanaContextProvider>,
    element
  );
  return () => ReactDOM.unmountComponentAtNode(element);
};

export const initializeCanvas = async (
  coreSetup: CoreSetup,
  coreStart: CoreStart,
  setupPlugins: CanvasSetupDeps,
  startPlugins: CanvasStartDeps,
  registries: SetupRegistries
) => {
  // Create Store
  const canvasStore = await createStore(coreSetup, setupPlugins);

  // Init Interpreter
  initInterpreter(startPlugins.expressions, setupPlugins.expressions).then(() => {
    registerLanguage(Object.values(startPlugins.expressions.getFunctions()));
  });

  // Init Registries
  initRegistries();
  populateRegistries(registries);

  // Set Badge
  coreStart.chrome.setBadge(
    coreStart.application.capabilities.canvas && coreStart.application.capabilities.canvas.save
      ? undefined
      : {
          text: strings.getText(),
          tooltip: strings.getTooltip(),
          iconType: 'glasses',
        }
  );

  // Set help extensions
  coreStart.chrome.setHelpExtension({
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

  return canvasStore;
};

export const teardownCanvas = (coreStart: CoreStart) => {
  destroyRegistries();
  resetInterpreter();

  coreStart.chrome.setBadge(undefined);
  coreStart.chrome.setHelpExtension(undefined);
};
