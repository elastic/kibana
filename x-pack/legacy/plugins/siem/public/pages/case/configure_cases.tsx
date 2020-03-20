/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { WrapperPage } from '../../components/wrapper_page';
import { CaseHeaderPage } from './components/case_header_page';
import { SpyRoute } from '../../utils/route/spy_routes';
import { getCaseUrl } from '../../components/link_to';
import { WhitePageWrapper, SectionWrapper } from './components/wrappers';
import * as i18n from './translations';
import { ConfigureCases } from './components/configure_cases';

const backOptions = {
  href: getCaseUrl(),
  text: i18n.BACK_TO_ALL,
};

const wrapperPageStyle: Record<string, string> = {
  paddingLeft: '0',
  paddingRight: '0',
  paddingBottom: '0',
};

const ConfigureCasesPageComponent: React.FC = () => (
  <>
    <WrapperPage style={wrapperPageStyle}>
      <SectionWrapper>
        <CaseHeaderPage title={i18n.CONFIGURE_CASES_PAGE_TITLE} backOptions={backOptions} />
      </SectionWrapper>
      <WhitePageWrapper>
        <ConfigureCases />
      </WhitePageWrapper>
    </WrapperPage>
    <SpyRoute />
  </>
);

export const ConfigureCasesPage = React.memo(ConfigureCasesPageComponent);
