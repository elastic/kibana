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

export const mount =
  (coreSetup: CoreSetup<StartDependencies>) =>
  async ({ element }: AppMountParameters) => {
    const [core, plugins] = await coreSetup.getStartServices();
    const { App } = await import('./app');

    const defaultIndexPattern = await plugins.data.indexPatterns.getDefault();
    const lensFormulaHelper = await plugins.lens.createFormulaHelper();

    const i18nCore = core.i18n;

    const reactElement = (
      <i18nCore.Context>
        <App
          core={core}
          plugins={plugins}
          defaultDataView={defaultIndexPattern}
          lensFormulaHelper={lensFormulaHelper}
        />
      </i18nCore.Context>
    );
    render(reactElement, element);
    return () => unmountComponentAtNode(element);
  };
