/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { CoreSetup, AppMountParameters } from '@kbn/core/public';
import { StartDependencies, UiActionsEnhancedExamplesStart } from './plugin';
import { UiActionsExampleAppContextValue, context } from './context';

export const mount =
  (coreSetup: CoreSetup<StartDependencies, UiActionsEnhancedExamplesStart>) =>
  async ({ appBasePath, element }: AppMountParameters) => {
    const [
      core,
      plugins,
      { managerWithoutEmbeddable, managerWithoutEmbeddableSingleButton, managerWithEmbeddable },
    ] = await coreSetup.getStartServices();
    const { App } = await import('./containers/app');

    const deps: UiActionsExampleAppContextValue = {
      appBasePath,
      core,
      plugins,
      managerWithoutEmbeddable,
      managerWithoutEmbeddableSingleButton,
      managerWithEmbeddable,
    };
    const reactElement = (
      <context.Provider value={deps}>
        <App />
      </context.Provider>
    );
    render(reactElement, element);
    return () => unmountComponentAtNode(element);
  };
