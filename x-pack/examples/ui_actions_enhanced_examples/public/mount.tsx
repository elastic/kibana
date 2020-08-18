/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { CoreSetup, CoreStart, AppMountParameters } from 'kibana/public';
import { StartDependencies } from './plugin';

export interface BfetchDeps {
  appBasePath: string;
  core: CoreStart;
  plugins: StartDependencies;
}

export const mount = (coreSetup: CoreSetup<StartDependencies>) => async ({
  appBasePath,
  element,
}: AppMountParameters) => {
  const [core, plugins] = await coreSetup.getStartServices();
  const deps: BfetchDeps = { appBasePath, core, plugins };
  const { App } = await import('./containers/app');
  const reactElement = <App />;
  render(reactElement, element);
  return () => unmountComponentAtNode(element);
};
