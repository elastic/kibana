/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { CoreStart } from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { SeedLabFab } from './seed_lab_fab';

/** Mounts a global floating Lab button that can seed sample data from any page. */
export function mountSeedLabFab(core: CoreStart): () => void {
  const container = document.createElement('div');
  container.setAttribute('data-test-subj', 'seedLabFabRoot');
  document.body.appendChild(container);

  ReactDOM.render(
    <KibanaRenderContextProvider {...core}>
      <SeedLabFab core={core} />
    </KibanaRenderContextProvider>,
    container
  );

  return () => {
    ReactDOM.unmountComponentAtNode(container);
    container.remove();
  };
}
