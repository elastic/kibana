/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { PaginatedTable } from '../../../paginated_table';

import { getCasesColumns } from './columns';
import { CasesSavedObjects } from '../../../../graphql/types';

interface CasesTableProps {
  id: string;
  cases: CasesSavedObjects;
}

export const CasesPaginatedTable = React.memo(({ id, cases }: CasesTableProps) => {
  const [activePage, updateActivePage] = useState(0);
  const [limit, updateLimitPagination] = useState(10);

  return (
    <PaginatedTable
      activePage={activePage}
      columns={getCasesColumns()}
      headerCount={cases.total}
      headerTitle={
        <FormattedMessage id="xpack.siem.casesTable.header" defaultMessage="Case Management" />
      }
      headerUnit={'cases'}
      id={id}
      limit={limit}
      loading={false}
      loadPage={page => updateActivePage(page)}
      pageOfItems={cases.saved_objects}
      showMorePagesIndicator={true}
      totalCount={cases.total}
      updateActivePage={updateActivePage}
      updateLimitPagination={updateLimitPagination}
    />
  );
});

CasesPaginatedTable.displayName = 'CasesPaginatedTable';
