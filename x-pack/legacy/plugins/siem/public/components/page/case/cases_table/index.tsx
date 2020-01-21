/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexItem } from '@elastic/eui';
import { CasesPaginatedTable } from './table_hook';

export const CasesTable = React.memo(() => {
  return (
    <EuiFlexItem>
      <CasesPaginatedTable id={'getCases'} />
    </EuiFlexItem>
  );
});

CasesTable.displayName = 'CasesTable';
