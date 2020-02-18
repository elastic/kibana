/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import { EuiBasicTableColumn, EuiIconTip, EuiLink, EuiTextColor } from '@elastic/eui';
import { DefaultItemIconButtonAction } from '@elastic/eui/src/components/basic_table/action_types';
import React from 'react';
import { getEmptyTagValue } from '../../../../components/empty_value';
import { ColumnTypes } from './types';

const actions: Array<DefaultItemIconButtonAction<ColumnTypes>> = [
  {
    available: (item: ColumnTypes) => item.status === 'Running',
    description: 'Stop',
    icon: 'stop',
    isPrimary: true,
    name: 'Stop',
    onClick: () => {},
    type: 'icon' as const,
  },
  {
    available: (item: ColumnTypes) => item.status === 'Stopped',
    description: 'Resume',
    icon: 'play',
    isPrimary: true,
    name: 'Resume',
    onClick: () => {},
    type: 'icon' as const,
  },
];

// Michael: Are we able to do custom, in-table-header filters, as shown in my wireframes?
export const columns: Array<EuiBasicTableColumn<ColumnTypes>> = [
  {
    field: 'rule',
    name: 'Rule',
    render: (value: ColumnTypes['rule']) => <EuiLink href={value.href}>{value.name}</EuiLink>,
    sortable: true,
    truncateText: true,
  },
  {
    field: 'ran',
    name: 'Ran',
    render: (value: ColumnTypes['ran']) => '--',
    sortable: true,
    truncateText: true,
  },
  {
    field: 'lookedBackTo',
    name: 'Looked back to',
    render: (value: ColumnTypes['lookedBackTo']) => '--',
    sortable: true,
    truncateText: true,
  },
  {
    field: 'status',
    name: 'Status',
    sortable: true,
    truncateText: true,
  },
  {
    field: 'response',
    name: 'Response',
    render: (value: ColumnTypes['response']) => {
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
