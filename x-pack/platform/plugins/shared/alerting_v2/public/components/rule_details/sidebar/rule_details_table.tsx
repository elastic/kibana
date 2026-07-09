/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTable,
  EuiTableBody,
  EuiTableRow,
  EuiTableRowCell,
} from '@elastic/eui';

export interface RuleDetailsTableItem {
  title: ReactNode;
  description?: ReactNode;
  'data-test-subj'?: string;
  fullWidthContent?: ReactNode;
}

export interface RuleDetailsTableProps {
  items: RuleDetailsTableItem[];
}

// Fixed so every RuleDetailsTable instance (rule conditions, metadata) shares
// the same column widths regardless of its own content.
const TITLE_COLUMN_WIDTH = 130;

export const RuleDetailsTable: React.FunctionComponent<RuleDetailsTableProps> = ({ items }) => {
  return (
    <EuiTable
      compressed
      css={{
        tableLayout: 'fixed',
        '.euiTableCellContent': {
          minHeight: 24,
          paddingBlock: 0,
        },
      }}
    >
      <EuiTableBody>
        {items.map((item, index) =>
          item.fullWidthContent ? (
            <EuiTableRow key={index}>
              <EuiTableRowCell colSpan={2} valign="top" data-test-subj={item['data-test-subj']}>
                <div css={{ paddingBlock: 4 }}>
                  <EuiFlexGroup gutterSize="none" alignItems="baseline" responsive={false}>
                    <EuiFlexItem grow={false} css={{ width: TITLE_COLUMN_WIDTH }}>
                      <strong>{item.title}</strong>
                    </EuiFlexItem>
                    <EuiFlexItem>{item.description}</EuiFlexItem>
                  </EuiFlexGroup>
                  {item.fullWidthContent}
                </div>
              </EuiTableRowCell>
            </EuiTableRow>
          ) : (
            <EuiTableRow key={index}>
              <EuiTableRowCell width={TITLE_COLUMN_WIDTH}>
                <strong>{item.title}</strong>
              </EuiTableRowCell>
              <EuiTableRowCell data-test-subj={item['data-test-subj']}>
                {item.description}
              </EuiTableRowCell>
            </EuiTableRow>
          )
        )}
      </EuiTableBody>
    </EuiTable>
  );
};
