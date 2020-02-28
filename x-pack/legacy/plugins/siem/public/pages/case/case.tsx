/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiButton, EuiFlexGroup } from '@elastic/eui';
import { HeaderPage } from '../../components/header_page';
import { WrapperPage } from '../../components/wrapper_page';
import { AllCases } from './components/all_cases';
import { SpyRoute } from '../../utils/route/spy_routes';
import * as i18n from './translations';
import { getCreateCaseUrl } from '../../components/link_to';

const badgeOptions = {
  beta: true,
  text: i18n.PAGE_BADGE_LABEL,
  tooltip: i18n.PAGE_BADGE_TOOLTIP,
};

export const CasesPage = React.memo(() => (
  <>
    <WrapperPage>
      <HeaderPage badgeOptions={badgeOptions} subtitle={i18n.PAGE_SUBTITLE} title={i18n.PAGE_TITLE}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
          <EuiButton fill href={getCreateCaseUrl()} iconType="plusInCircle">
            {i18n.CREATE_TITLE}
          </EuiButton>
        </EuiFlexGroup>
      </HeaderPage>
      <AllCases />
    </WrapperPage>
    <SpyRoute />
  </>
));

CasesPage.displayName = 'CasesPage';
