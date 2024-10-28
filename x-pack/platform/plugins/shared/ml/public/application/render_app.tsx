/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import type { AppMountParameters, CoreStart } from '@kbn/core/public';

import type { ExperimentalFeatures, MlFeatures, NLPSettings } from '@kbn/ml-common-constants/app';

import type { MlDependencies } from './app';
import { AppLazy } from './app_lazy';

export const renderApp = (
  coreStart: CoreStart,
  deps: MlDependencies,
  appMountParams: AppMountParameters,
  isServerless: boolean,
  mlFeatures: MlFeatures,
  experimentalFeatures: ExperimentalFeatures,
  nlpSettings: NLPSettings
) => {
  appMountParams.onAppLeave((actions) => actions.default());

  ReactDOM.render(
    <AppLazy
      coreStart={coreStart}
      deps={deps}
      appMountParams={appMountParams}
      isServerless={isServerless}
      mlFeatures={mlFeatures}
      experimentalFeatures={experimentalFeatures}
      nlpSettings={nlpSettings}
    />,
    appMountParams.element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(appMountParams.element);
    deps.data.search.session.clear();
  };
};
