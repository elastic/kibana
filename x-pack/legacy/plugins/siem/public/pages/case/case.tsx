/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { WrapperPage } from '../../components/wrapper_page';
import { AllCases } from './components/all_cases';
import { SpyRoute } from '../../utils/route/spy_routes';

export const CasesPage = React.memo(() => (
  <>
    <WrapperPage>
      <AllCases />
    </WrapperPage>
    <SpyRoute />
  </>
));

CasesPage.displayName = 'CasesPage';
