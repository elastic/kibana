/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { CoreSetup, AppMountParameters } from 'kibana/public';
import { StartDependencies } from './plugin';

export const mount = (coreSetup: CoreSetup<StartDependencies>) => async ({
  element,
}: AppMountParameters) => {
  const [core, plugins] = await coreSetup.getStartServices();
  const { App } = await import('./app');

  const deps = {
    core,
    plugins,
  };

  const defaultIndexPattern = await plugins.data.indexPatterns.getDefault();

  const reactElement = <App {...deps} defaultIndexPattern={defaultIndexPattern} />;
  render(reactElement, element);
  return () => unmountComponentAtNode(element);
};
