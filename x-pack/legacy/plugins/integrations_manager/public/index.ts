/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import ReactDOM from 'react-dom';
import 'ui/autoload/all';
import 'ui/autoload/styles';
import chrome from 'ui/chrome';
import { npSetup, npStart } from 'ui/new_platform';
import { PLUGIN_ID } from '../common/constants';
import { Plugin, PluginInitializerContext, PluginStart } from './plugin';

const REACT_APP_ROOT_ID = `react-${PLUGIN_ID}-root`;
const template = `<div id="${REACT_APP_ROOT_ID}" class="integrationsManagerReactRoot"></div>`;
const getRootEl = () => document.getElementById(REACT_APP_ROOT_ID);

main();

async function main(): Promise<void> {
  const initializerContext: PluginInitializerContext = {};
  const plugin = new Plugin(initializerContext);
  plugin.setup(npSetup.core);

  // @ts-ignore
  chrome.setRootTemplate(template);

  await waitFor(getRootEl);
  const { root }: PluginStart = plugin.start(npStart.core);
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
