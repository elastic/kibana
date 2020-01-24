/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { HeaderPage } from '../../components/header_page';
import { WrapperPage } from '../../components/wrapper_page';
import { AllCases } from './components/all_cases';
import { CasesSearchBar } from './components/search_bar';
import { SpyRoute } from '../../utils/route/spy_routes';
import * as i18n from './translations';

export const CasesPage = React.memo(() => (
  <>
    <WrapperPage>
      <HeaderPage
        badgeOptions={{
          beta: true,
          text: i18n.PAGE_BADGE_LABEL,
          tooltip: i18n.PAGE_BADGE_TOOLTIP,
        }}
        subtitle={i18n.PAGE_SUBTITLE}
        title={i18n.PAGE_TITLE}
      />
      {/* <CasesSearchBar /> */}
      <AllCases />
    </WrapperPage>
    <SpyRoute />
  </>
));

CasesPage.displayName = 'CasesPage';
