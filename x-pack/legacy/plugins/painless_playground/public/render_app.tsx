/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { PainlessPlayground } from './components/painless_playground';
import { PainlessPlaygroundService } from './services/painless_playground_service';
import { createKibanaReactContext } from '../../../../../src/plugins/kibana_react/public';

export function renderApp(element: any, npStart: any) {
  const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
    uiSettings: npStart.core.uiSettings,
  });
  render(
    <KibanaReactContextProvider>
      <I18nProvider>
        <PainlessPlayground service={new PainlessPlaygroundService(npStart.core.http)} />
      </I18nProvider>
    </KibanaReactContextProvider>,
    element
  );
  return () => unmountComponentAtNode(element);
}
