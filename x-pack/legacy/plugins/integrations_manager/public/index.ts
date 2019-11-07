/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import ReactDOM from 'react-dom';
import euiLight from '@elastic/eui/dist/eui_theme_light.json';
import euiDark from '@elastic/eui/dist/eui_theme_dark.json';
import chrome from 'ui/chrome';
import { npSetup, npStart } from 'ui/new_platform';
import { Plugin, PluginInitializerContext, PluginStart } from './plugin';
import { routes } from './routes';

// create './types' later and move there?
export type DetailViewPanelName = 'overview' | 'assets' | 'data-sources';

const REACT_APP_ROOT_ID = 'epm__root';
const template = `<div id="${REACT_APP_ROOT_ID}" style="flex-grow: 1; display: flex; flex-direction: column"></div>`;
const getRootEl = () => document.getElementById(REACT_APP_ROOT_ID);

main();

async function main(): Promise<void> {
  const initializerContext: PluginInitializerContext = {};
  const plugin = new Plugin(initializerContext);
  plugin.setup(npSetup.core);

  // @ts-ignore
  chrome.setRootTemplate(template);

  await waitFor(getRootEl);

  const isDarkMode = npStart.core.uiSettings.get('theme:darkMode');
  const { root }: PluginStart = plugin.start({
    ...npStart.core,
    routes,
    theme: { eui: isDarkMode ? euiDark : euiLight },
  });

  const container = getRootEl();
  ReactDOM.render(root, container);
}

function waitFor(fn: () => any) {
  return new Promise(resolve => {
    if (fn()) {
      resolve();
    } else {
      setTimeout(() => resolve(waitFor(fn)), 10);
    }
  });
}
