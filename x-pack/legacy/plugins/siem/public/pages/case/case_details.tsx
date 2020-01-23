/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import React from 'react';

import { WrapperPage } from '../../components/wrapper_page';
import { CaseView } from './components/case_view';
import { SpyRoute } from '../../utils/route/spy_routes';

interface Props {
  caseId: string;
}

export const CaseDetailsPage = React.memo(({ caseId }: Props) => (
  <>
    <WrapperPage>
      <EuiFlexGroup>
        <CaseView caseId={caseId} />
      </EuiFlexGroup>
    </WrapperPage>
    <SpyRoute />
  </>
));

CaseDetailsPage.displayName = 'CaseDetailsPage';
