/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { AppMountParameters, AppUnmount, CoreStart } from '@kbn/core/public';
import type { CasesPublicStartDependencies } from '../types';
import { InvestigationsApp } from './app';

export interface RenderInvestigationsAppProps {
  coreStart: CoreStart;
  pluginsStart: CasesPublicStartDependencies;
  params: AppMountParameters;
}

/** Mounts the Investigations app and returns the function that unmounts it. */
export const renderInvestigationsApp = ({
  coreStart,
  pluginsStart,
  params,
}: RenderInvestigationsAppProps): AppUnmount => {
  ReactDOM.render(
    coreStart.rendering.addContext(
      <InvestigationsApp
        coreStart={coreStart}
        pluginsStart={pluginsStart}
        history={params.history}
      />
    ),
    params.element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(params.element);
  };
};
