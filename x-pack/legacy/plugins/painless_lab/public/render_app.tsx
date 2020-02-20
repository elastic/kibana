/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { CoreStart } from 'kibana/public';
import { render, unmountComponentAtNode } from 'react-dom';
import { Main } from './components/main';
import { createKibanaReactContext } from '../../../../../src/plugins/kibana_react/public';

export function renderApp(element: any, { http, i18n, uiSettings }: CoreStart) {
  const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
    uiSettings,
  });
  render(
    <i18n.Context>
      <KibanaReactContextProvider>
        <Main http={http} />
      </KibanaReactContextProvider>
    </i18n.Context>,
    element
  );
  return () => unmountComponentAtNode(element);
}
