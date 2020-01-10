/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { PaginatedTable } from '../../../paginated_table';

import { CasesQuery } from '../../../../containers/case/get_cases';
import { getCasesColumns } from './columns';

export const CasesTable = React.memo(() => {
  const [activePage, updateActivePage] = useState(0);
  const [limit, updateLimitPagination] = useState(10);

  return (
    <EuiFlexItem>
      <CasesQuery sourceId="default">
        {children => (
          <PaginatedTable
            activePage={activePage}
            columns={getCasesColumns()}
            headerCount={children.cases.total}
            headerTitle={
              <FormattedMessage
                id="xpack.siem.casesTable.header"
                defaultMessage="Case Management"
              />
            }
            headerUnit={'cases'}
            id={children.id}
            limit={limit}
            loading={false}
            loadPage={page => updateActivePage(page)}
            pageOfItems={children.cases.saved_objects}
            showMorePagesIndicator={true}
            totalCount={children.cases.total}
            updateActivePage={updateActivePage}
            updateLimitPagination={updateLimitPagination}
          />
        )}
      </CasesQuery>
    </EuiFlexItem>
  );
});

CasesTable.displayName = 'CasesTable';
