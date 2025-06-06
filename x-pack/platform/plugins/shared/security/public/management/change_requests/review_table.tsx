/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTableDataType } from '@elastic/eui';
import { EuiBasicTable, EuiPanel } from '@elastic/eui';
import React from 'react';

export const ReviewTable = () => {
  // Load data from API instead
  const items = [
    {
      id: '1',
      title: 'Fix navbar bug',
      status: 'Pending',
      urgency: 'High',
      submittedAt: new Date('2025-06-01T14:20:00'),
      lastUpdated: new Date('2025-06-04T10:30:00'),
      actions: 3,
    },
    {
      id: '2',
      title: 'Add dark mode support',
      status: 'Applied by Dave',
      urgency: 'Medium',
      submittedAt: new Date('2025-05-29T09:10:00'),
      lastUpdated: new Date('2025-06-02T16:00:00'),
      actions: 1,
    },
  ];

  // Which columns does an admin care about?
  const columns = [
    {
      field: 'title',
      name: 'Title',
      sortable: true,
      truncateText: true,
    },
    {
      field: 'status',
      name: 'Status',
      sortable: true,
    },
    {
      field: 'urgency',
      name: 'Urgency',
      sortable: true,
    },
    {
      field: 'submittedAt',
      name: 'Submitted',
      dataType: 'date' as EuiTableDataType,
      sortable: true,
    },
    {
      field: 'lastUpdated',
      name: 'Last updated',
      dataType: 'date' as EuiTableDataType,
      sortable: true,
    },
    {
      field: 'actions',
      name: 'Actions',
      dataType: 'number' as EuiTableDataType,
      sortable: true,
    },
  ];

  // I guess you select an item which opens it in a flyout where you then take action?

  return (
    <EuiPanel paddingSize="m">
      <EuiBasicTable items={items} columns={columns} rowHeader="title" />
    </EuiPanel>
  );
};
