/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiPageTemplate, EuiTitle, EuiText } from '@elastic/eui';
import ReactDOM from 'react-dom';
import { AppMountParameters, CoreStart } from '@kbn/core/public';

export const renderApp = (_core: CoreStart, { element }: AppMountParameters) => {
  ReactDOM.render(
    <EuiPageTemplate restrictWidth="1000px">
      <EuiPageTemplate.Header>
        <EuiTitle size="l">
          <h1>EuiProvider is missing</h1>
        </EuiTitle>
      </EuiPageTemplate.Header>
      <EuiPageTemplate.Section>
        <EuiTitle>
          <h2>Goal of this page</h2>
        </EuiTitle>
        <EuiText>
          <p>
            The goal of this page is to create a UI that attempts to render EUI React components
            without wrapping the rendering tree in EuiProvider.
          </p>
        </EuiText>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
