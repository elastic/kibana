/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { CoreSetup, AppMountParameters } from 'kibana/public';
import { StartDependencies } from './plugin';
import { App } from './application/containers/app/lazy';

export const mount = (coreSetup: CoreSetup<StartDependencies>) => async ({
  appBasePath,
  element,
}: AppMountParameters) => {
  const reactElement = <App />;
  render(reactElement, element);
  return () => unmountComponentAtNode(element);
};
