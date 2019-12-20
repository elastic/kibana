/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiIconTip,
  EuiLink,
  EuiTextColor,
  EuiBasicTableColumn,
  EuiTableActionsColumnType,
} from '@elastic/eui';
import React from 'react';
import { getEmptyTagValue } from '../../../../components/empty_value';
import { ColumnTypes } from './index';

const actions: EuiTableActionsColumnType<ColumnTypes>['actions'] = [
  {
    available: (item: ColumnTypes) => item.status === 'Running',
    description: 'Stop',
    icon: 'stop',
    isPrimary: true,
    name: 'Stop',
    onClick: () => {},
    type: 'icon',
  },
  {
    available: (item: ColumnTypes) => item.status === 'Stopped',
    description: 'Resume',
    icon: 'play',
    isPrimary: true,
    name: 'Resume',
    onClick: () => {},
    type: 'icon',
  },
];

// Michael: Are we able to do custom, in-table-header filters, as shown in my wireframes?
export const columns: Array<EuiBasicTableColumn<ColumnTypes>> = [
  {
    field: 'rule' as const,
    name: 'Rule',
    render: (value: ColumnTypes['rule'], _: ColumnTypes) => (
      <EuiLink href={value.href}>{value.name}</EuiLink>
    ),
    sortable: true,
    truncateText: true,
  },
  {
    field: 'ran' as const,
    name: 'Ran',
    render: (value: ColumnTypes['ran'], _: ColumnTypes) => '--',
    sortable: true,
    truncateText: true,
  },
  {
    field: 'lookedBackTo' as const,
    name: 'Looked back to',
    render: (value: ColumnTypes['lookedBackTo'], _: ColumnTypes) => '--',
    sortable: true,
    truncateText: true,
  },
  {
    field: 'status' as const,
    name: 'Status',
    sortable: true,
    truncateText: true,
  },
  {
    field: 'response' as const,
    name: 'Response',
    render: (value: ColumnTypes['response'], _: ColumnTypes) => {
      return value === undefined ? (
        getEmptyTagValue()
      ) : (
        <>
          {value === 'Fail' ? (
            <EuiTextColor color="danger">
              {value} <EuiIconTip content="Full fail message here." type="iInCircle" />
            </EuiTextColor>
          ) : (
            <EuiTextColor color="secondary">{value}</EuiTextColor>
          )}
        </>
      );
    },
    sortable: true,
    truncateText: true,
  },
  {
    actions,
    width: '40px',
  },
];
