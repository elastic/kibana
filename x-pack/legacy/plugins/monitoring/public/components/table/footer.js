/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  KuiToolBarFooter,
  KuiToolBarFooterSection,
  KuiToolBarText
} from '@kbn/ui-framework/components';
import { FormattedMessage } from '@kbn/i18n/react';

export function MonitoringTableFooter({ pageIndexFirstRow, pageIndexLastRow, rowsFiltered, paginationControls }) {
  return (
    <KuiToolBarFooter>
      <KuiToolBarFooterSection>
        <KuiToolBarText>
          <FormattedMessage
            id="xpack.monitoring.table.footer.pageRowsDescription"
            defaultMessage="{pageIndexFirstRow} &ndash; {pageIndexLastRow} of {rowsFiltered}"
            values={{
              pageIndexFirstRow,
              pageIndexLastRow,
              rowsFiltered
            }}
          />
        </KuiToolBarText>

        { paginationControls }
      </KuiToolBarFooterSection>
    </KuiToolBarFooter>
  );
}
