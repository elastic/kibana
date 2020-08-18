/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { CoreSetup, AppMountParameters } from 'kibana/public';
import { StartDependencies } from './plugin';
import { UiActionsExampleAppContextValue, context } from './context';

export const mount = (coreSetup: CoreSetup<StartDependencies>) => async ({
  appBasePath,
  element,
}: AppMountParameters) => {
  const [core, plugins] = await coreSetup.getStartServices();
  const { App } = await import('./containers/app');
  const deps: UiActionsExampleAppContextValue = { appBasePath, core, plugins };
  const reactElement = (
    <context.Provider value={deps}>
      <App />
    </context.Provider>
  );
  render(reactElement, element);
  return () => unmountComponentAtNode(element);
};
