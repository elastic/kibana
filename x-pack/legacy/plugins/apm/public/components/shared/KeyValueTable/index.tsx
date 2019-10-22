/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { TableHTMLAttributes } from 'react';
import {
  EuiTable,
  EuiTableProps,
  EuiTableBody,
  EuiTableRow,
  EuiTableRowCell
} from '@elastic/eui';
import { FormattedValue } from './FormattedValue';
import { KeyValuePair } from '../../../utils/flattenObject';

export function KeyValueTable({
  keyValuePairs,
  tableProps = {}
}: {
  keyValuePairs: KeyValuePair[];
  tableProps?: EuiTableProps & TableHTMLAttributes<HTMLTableElement>;
}) {
  return (
    <EuiTable compressed {...tableProps}>
      <EuiTableBody>
        {keyValuePairs.map(({ key, value }) => (
          <EuiTableRow key={key}>
            <EuiTableRowCell>
              <strong data-testid="dot-key">{key}</strong>
            </EuiTableRowCell>
            <EuiTableRowCell data-testid="value">
              <FormattedValue value={value} />
            </EuiTableRowCell>
          </EuiTableRow>
        ))}
      </EuiTableBody>
    </EuiTable>
  );
}
