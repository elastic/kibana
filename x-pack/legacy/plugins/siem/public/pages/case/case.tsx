/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { WrapperPage } from '../../components/wrapper_page';
import { useIsUserCanCrud } from '../../lib/kibana';
import { SpyRoute } from '../../utils/route/spy_routes';
import { AllCases } from './components/all_cases';
import { CaseSavedObjectNotAvailable } from './saved_object_not_available';

export const CasesPage = React.memo(() => {
  const isUserCanCrud = useIsUserCanCrud();

  return isUserCanCrud ? (
    <>
      <WrapperPage>
        <AllCases />
      </WrapperPage>
      <SpyRoute />
    </>
  ) : (
    <CaseSavedObjectNotAvailable />
  );
});

CasesPage.displayName = 'CasesPage';
