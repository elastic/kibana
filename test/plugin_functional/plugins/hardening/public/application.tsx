/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiPageTemplate, EuiTitle, EuiText } from '@elastic/eui';
import ReactDOM from 'react-dom';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { tryPollutingPrototypes } from '../common/pollute';

export const renderApp = (_core: CoreStart, { element }: AppMountParameters) => {
  const result = JSON.stringify(tryPollutingPrototypes(), null, 2);

  ReactDOM.render(
    <EuiPageTemplate restrictWidth="1000px">
      <EuiPageTemplate.Header>
        <EuiTitle size="l">
          <h1>Hardening tests</h1>
        </EuiTitle>
      </EuiPageTemplate.Header>
      <EuiPageTemplate.Section>
        <EuiTitle>
          <h2>Goal of this page</h2>
        </EuiTitle>
        <EuiText>
          <p>
            The goal of this page is to attempt to pollute prototypes client-side, and report on the
            success/failure of these attempts.
          </p>
        </EuiText>
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section>
        <EuiTitle>
          <h2>Result</h2>
        </EuiTitle>
        <EuiText>
          <pre data-test-subj="pollution-result">{result}</pre>
        </EuiText>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
