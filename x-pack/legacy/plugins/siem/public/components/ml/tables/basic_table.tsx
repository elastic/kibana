/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import styled from 'styled-components';
import { EuiInMemoryTable, EuiInMemoryTableProps } from '@elastic/eui';

type BasicTableType<T> = React.ComponentType<EuiInMemoryTableProps<T>>;
export const BasicTable: typeof EuiInMemoryTable & { displayName: string } = styled(
  EuiInMemoryTable as BasicTableType<any> // eslint-disable-line @typescript-eslint/no-explicit-any
)`
  tbody {
    th,
    td {
      vertical-align: top;
    }
    .euiTableCellContent {
      display: block;
    }
  }
` as any; // eslint-disable-line @typescript-eslint/no-explicit-any

BasicTable.displayName = 'BasicTable';
