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

import { VALUE_CLICK_TRIGGER, ActionByType } from '../../../../../src/plugins/ui_actions/public';
/* eslint-disable */
import { ACTION_VALUE_CLICK } from '../../../../../src/plugins/data/public/actions/value_click_action';
/* eslint-enable */
import { init as initStatsReporter } from './lib/ui_metric';

import { CapabilitiesStrings } from '../i18n';

import { startServices, stopServices, services } from './services';

const { ReadOnlyBadge: strings } = CapabilitiesStrings;

let restoreAction: ActionByType<any> | undefined;
const emptyAction = {
  id: 'empty-action',
  type: '',
  getDisplayName: () => 'empty action',
  getIconType: () => undefined,
  isCompatible: async () => true,
  execute: async () => undefined,
} as ActionByType<any>;

export const renderApp = (
  coreStart: CoreStart,
  plugins: CanvasStartDeps,
  { element }: AppMountParameters,
  canvasStore: Store
) => {
  const canvasServices = Object.entries(services).reduce((reduction, [key, provider]) => {
    reduction[key] = provider.getService();

    return reduction;
  }, {} as Record<string, any>);

  ReactDOM.render(
    <KibanaContextProvider services={{ ...plugins, ...coreStart, canvas: canvasServices }}>
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
  startServices(coreSetup, coreStart, setupPlugins, startPlugins);

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
    content: domNode => {
      ReactDOM.render(<HelpMenu />, domNode);
      return () => ReactDOM.unmountComponentAtNode(domNode);
    },
  });

  // TODO: We need this to disable the filtering modal from popping up in lens embeds until
  // they honor the disableTriggers parameter
  const action = startPlugins.uiActions.getAction(ACTION_VALUE_CLICK);

  if (action) {
    restoreAction = action;

    startPlugins.uiActions.detachAction(VALUE_CLICK_TRIGGER, action.id);
    startPlugins.uiActions.attachAction(VALUE_CLICK_TRIGGER, emptyAction);
  }

  if (setupPlugins.usageCollection) {
    initStatsReporter(setupPlugins.usageCollection.reportUiStats);
  }

  return canvasStore;
};

export const teardownCanvas = (coreStart: CoreStart, startPlugins: CanvasStartDeps) => {
  stopServices();
  destroyRegistries();
  resetInterpreter();

  startPlugins.uiActions.detachAction(VALUE_CLICK_TRIGGER, emptyAction.id);
  if (restoreAction) {
    startPlugins.uiActions.attachAction(VALUE_CLICK_TRIGGER, restoreAction);
    restoreAction = undefined;
  }

  coreStart.chrome.setBadge(undefined);
  coreStart.chrome.setHelpExtension(undefined);
};
