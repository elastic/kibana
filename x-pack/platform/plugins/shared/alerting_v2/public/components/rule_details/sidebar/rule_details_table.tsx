/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { EuiTable, EuiTableBody, EuiTableRow, EuiTableRowCell } from '@elastic/eui';

export interface RuleDetailsTableItem {
  title: ReactNode;
  description: ReactNode;
  'data-test-subj'?: string;
}

export interface RuleDetailsTableProps {
  items: RuleDetailsTableItem[];
}

export const RuleDetailsTable: React.FunctionComponent<RuleDetailsTableProps> = ({ items }) => {
  return (
    <EuiTable
      compressed
      css={{
        tableLayout: 'auto',
        '.euiTableCellContent': {
          height: 24,
          paddingBlock: 0,
        },
      }}
    >
      <EuiTableBody>
        {items.map((item, index) => (
          <EuiTableRow key={index}>
            <EuiTableRowCell>
              <strong>{item.title}</strong>
            </EuiTableRowCell>
            <EuiTableRowCell data-test-subj={item['data-test-subj']}>
              {item.description}
            </EuiTableRowCell>
          </EuiTableRow>
        ))}
      </EuiTableBody>
    </EuiTable>
  );
};
