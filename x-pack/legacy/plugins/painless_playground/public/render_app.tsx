/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { PainlessPlayground } from './components/painless_playground';
import { createKibanaReactContext } from '../../../../../src/plugins/kibana_react/public';
import { executeCode } from './lib/execute_code';

export function renderApp(element: any, npStart: any) {
  const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
    uiSettings: npStart.core.uiSettings,
  });
  render(
    <KibanaReactContextProvider>
      <PainlessPlayground executeCode={payload => executeCode(npStart.core.http, payload)} />
    </KibanaReactContextProvider>,
    element
  );
  return () => unmountComponentAtNode(element);
}
