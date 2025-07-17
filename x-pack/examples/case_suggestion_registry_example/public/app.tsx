/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiPageSection,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
} from '@elastic/eui';
import { CoreStart } from '@kbn/core/public';
import { StartDependencies } from './plugin';

export const App = ({ core, plugins }: { core: CoreStart; plugins: StartDependencies }) => {
  return (
    <EuiPage>
      <EuiPageBody style={{ maxWidth: 1200, margin: '0 auto' }}>
        <EuiPageHeader>
          <EuiPageHeaderSection>
            <EuiTitle size="l">
              <h1>Cases Suggestion Registry Example</h1>
            </EuiTitle>
          </EuiPageHeaderSection>
        </EuiPageHeader>
        <EuiPageSection>
          <p>
            This app embeds an Observability Exploratory view as embeddable component. Make sure you
            have data in heartbeat-* index within last 5 days for this demo to work.
          </p>
        </EuiPageSection>
      </EuiPageBody>
    </EuiPage>
  );
};
