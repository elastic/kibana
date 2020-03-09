/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled, { css } from 'styled-components';

import { WrapperPage } from '../../components/wrapper_page';
import { CaseHeaderPage } from './components/case_header_page';
import { SpyRoute } from '../../utils/route/spy_routes';
import { getCaseUrl } from '../../components/link_to';
import { WhitePageWrapper, SectionWrapper } from './components/wrappers';
import { Connectors } from './components/configure_cases/connectors';
import * as i18n from './translations';
import { ClosureOptions } from './components/configure_cases/closure_options';
import { FieldMapping } from './components/configure_cases/field_mapping';

const backOptions = {
  href: getCaseUrl(),
  text: i18n.BACK_TO_ALL,
};

const wrapperPageStyle: Record<string, string> = {
  paddingLeft: '0',
  paddingRight: '0',
  paddingBottom: '0',
};

const FormWrapper = styled.div`
  ${({ theme }) => css`
    & > * {
      margin-top 40px;
    }

    padding-top: ${theme.eui.paddingSizes.l};
    padding-bottom: ${theme.eui.paddingSizes.l};
  `}
`;

const ConfigureCasesPageComponent: React.FC = () => (
  <>
    <WrapperPage style={wrapperPageStyle}>
      <SectionWrapper>
        <CaseHeaderPage title={i18n.CONFIGURE_CASES_PAGE_TITLE} backOptions={backOptions} />
      </SectionWrapper>
      <WhitePageWrapper>
        <FormWrapper>
          <SectionWrapper>
            <Connectors />
          </SectionWrapper>
          <SectionWrapper>
            <ClosureOptions />
          </SectionWrapper>
          <SectionWrapper>
            <FieldMapping />
          </SectionWrapper>
        </FormWrapper>
      </WhitePageWrapper>
    </WrapperPage>
    <SpyRoute />
  </>
);

export const ConfigureCasesPage = React.memo(ConfigureCasesPageComponent);
