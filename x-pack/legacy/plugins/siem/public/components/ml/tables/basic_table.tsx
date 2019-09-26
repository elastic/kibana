/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import styled from 'styled-components';
import { EuiInMemoryTable, EuiInMemoryTableProps } from '@elastic/eui';

// TODO: Remove this once EuiBasicTable supports in its table props the boolean of compressed
type ExtendedInMemoryTable = EuiInMemoryTableProps & { compressed: boolean };
const Extended: React.FunctionComponent<ExtendedInMemoryTable> = EuiInMemoryTable;

export const BasicTable = styled(Extended)`
  tbody {
    th,
    td {
      vertical-align: top;
    }

    .euiTableCellContent {
      display: block;
    }
  }
`;

BasicTable.displayName = 'BasicTable';
