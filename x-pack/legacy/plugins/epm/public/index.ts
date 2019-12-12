/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import euiDark from '@elastic/eui/dist/eui_theme_dark.json';
import euiLight from '@elastic/eui/dist/eui_theme_light.json';
import chrome from 'ui/chrome';
import { npSetup, npStart } from 'ui/new_platform';
import { Plugin, PluginInitializerContext } from './plugin';
import { routes } from './routes';

// create './types' later and move there?
export type DetailViewPanelName = 'overview' | 'data-sources';

const REACT_APP_ROOT_ID = 'epm__root';
const template = `<div id="${REACT_APP_ROOT_ID}" style="flex-grow: 1; display: flex; flex-direction: column"></div>`;
const getRootEl = () => document.getElementById(REACT_APP_ROOT_ID);

export const plugin = (initializerContext: PluginInitializerContext = {}) =>
  new Plugin(initializerContext);

const epmPlugin = plugin();
epmPlugin.setup(npSetup.core);

// @ts-ignore
chrome.setRootTemplate(template);

waitForElement(getRootEl).then(element => {
  const isDarkMode = npStart.core.uiSettings.get('theme:darkMode');
  epmPlugin.start({
    ...npStart.core,
    routes,
    theme: { eui: isDarkMode ? euiDark : euiLight },
    renderTo: element,
  });
});

function waitForElement(fn: () => HTMLElement | null): Promise<HTMLElement> {
  return new Promise(resolve => {
    const element = fn();
    if (element) {
      resolve(element);
    } else {
      setTimeout(() => resolve(waitForElement(fn)), 10);
    }
  });
}
