/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiPage } from '@elastic/eui';
import { Page } from '../../components/page';
import { DrilldownsManager } from '../drilldowns_manager';

export const App: React.FC = () => {
  return (
    <EuiPage>
      <Page title={'UI Actions Enhanced'}>
        <DrilldownsManager />
      </Page>
    </EuiPage>
  );
};
