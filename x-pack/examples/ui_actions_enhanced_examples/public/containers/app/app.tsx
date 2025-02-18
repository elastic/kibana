/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPage } from '@elastic/eui';
import { CoreStart } from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { Page } from '../../components/page';
import { DrilldownsManager } from '../drilldowns_manager';

export const App = ({ core }: { core: CoreStart }) => {
  return (
    <KibanaRenderContextProvider i18n={core.i18n} theme={core.theme}>
      <EuiPage>
        <Page title={'UI Actions Enhanced'}>
          <DrilldownsManager />
        </Page>
      </EuiPage>
    </KibanaRenderContextProvider>
  );
};
