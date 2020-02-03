/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import React from 'react';

import { WrapperPage } from '../../components/wrapper_page';
import { Create } from './components/create';
import { SpyRoute } from '../../utils/route/spy_routes';

export const CreateCasePage = React.memo(() => (
  <>
    <WrapperPage>
      <EuiFlexGroup>
        <Create />
      </EuiFlexGroup>
    </WrapperPage>
    <SpyRoute />
  </>
));

CreateCasePage.displayName = 'CreateCasePage';
