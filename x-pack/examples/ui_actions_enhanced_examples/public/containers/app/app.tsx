/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPage } from '@elastic/eui';
import { CoreStart } from '@kbn/core/public';
import { Page } from '../../components/page';
import { DrilldownsManager } from '../drilldowns_manager';

export const App = ({ core }: { core: CoreStart }) => {
  return core.rendering.addContext(
    <EuiPage>
      <Page title={'UI Actions Enhanced'}>
        <DrilldownsManager />
      </Page>
    </EuiPage>
  );
};
