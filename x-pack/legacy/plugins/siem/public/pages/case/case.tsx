/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiButton, EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { CaseHeaderPage } from './components/case_header_page';
import { WrapperPage } from '../../components/wrapper_page';
import { AllCases } from './components/all_cases';
import { SpyRoute } from '../../utils/route/spy_routes';
import * as i18n from './translations';
import { getCreateCaseUrl, getConfigureCasesUrl } from '../../components/link_to';

export const CasesPage = React.memo(() => (
  <>
    <WrapperPage>
      <CaseHeaderPage subtitle={i18n.PAGE_SUBTITLE} title={i18n.PAGE_TITLE}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
          <EuiFlexItem grow={false}>
            <EuiButton fill href={getCreateCaseUrl()} iconType="plusInCircle">
              {i18n.CREATE_TITLE}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon href={getConfigureCasesUrl()} iconType="gear" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </CaseHeaderPage>
      <AllCases />
    </WrapperPage>
    <SpyRoute />
  </>
));

CasesPage.displayName = 'CasesPage';
