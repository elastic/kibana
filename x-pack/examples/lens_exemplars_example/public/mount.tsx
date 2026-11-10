/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import type { BehaviorSubject } from 'rxjs';
import type { CoreSetup, AppMountParameters } from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { Exemplar } from './exemplars_extension';
import type { StartDependencies } from './plugin';

export const mount =
  (
    coreSetup: CoreSetup<StartDependencies>,
    selectedExemplar$: BehaviorSubject<Exemplar | undefined>
  ) =>
  async ({ element }: AppMountParameters) => {
    const [core, plugins] = await coreSetup.getStartServices();
    const { App } = await import('./app');

    render(
      <KibanaRenderContextProvider {...core}>
        <App plugins={plugins} selectedExemplar$={selectedExemplar$} />
      </KibanaRenderContextProvider>,
      element
    );
    return () => {
      selectedExemplar$.next(undefined);
      unmountComponentAtNode(element);
      plugins.data.search.session.clear();
    };
  };
