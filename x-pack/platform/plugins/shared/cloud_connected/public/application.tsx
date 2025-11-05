/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { CoreStart, AppMountParameters } from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { EuiPage, EuiPageBody, EuiPageSection, EuiTitle } from '@elastic/eui';
import { useBreadcrumbs } from './hooks/use_breadcrumbs';

interface CloudConnectedAppComponentProps {
  chrome: CoreStart['chrome'];
}

const CloudConnectedAppComponent: React.FC<CloudConnectedAppComponentProps> = ({ chrome }) => {
  useBreadcrumbs(chrome);

  return (
    <EuiPage restrictWidth={true}>
      <EuiPageBody>
        <EuiPageSection>
          <EuiTitle size="l">
            <h1>Hello World</h1>
          </EuiTitle>
        </EuiPageSection>
      </EuiPageBody>
    </EuiPage>
  );
};

export const CloudConnectedApp = (core: CoreStart, params: AppMountParameters) => {
  ReactDOM.render(
    <KibanaRenderContextProvider i18n={core.i18n} theme={core.theme}>
      <CloudConnectedAppComponent chrome={core.chrome} />
    </KibanaRenderContextProvider>,
    params.element
  );

  return () => ReactDOM.unmountComponentAtNode(params.element);
};
