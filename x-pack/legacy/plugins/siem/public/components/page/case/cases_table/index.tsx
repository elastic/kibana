/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexItem } from '@elastic/eui';

import { CasesQuery } from '../../../../containers/case/get_cases';
import { CasesPaginatedTable } from './table';

export const CasesTable = React.memo(() => {

  return (
    <EuiFlexItem>
      <CasesQuery sourceId="default">
        {children => <CasesPaginatedTable {...children} />}
      </CasesQuery>
    </EuiFlexItem>
  );
});

CasesTable.displayName = 'CasesTable';
