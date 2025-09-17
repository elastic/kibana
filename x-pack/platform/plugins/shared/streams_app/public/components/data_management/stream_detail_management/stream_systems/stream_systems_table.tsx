/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useState } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBasicTable, EuiButtonIcon, EuiHealth, EuiScreenReaderOnly } from '@elastic/eui';
import { type System } from '@kbn/streams-schema';

const columns: Array<EuiBasicTableColumn<System>> = [
  {
    field: 'title',
    name: 'Title',
    sortable: true,
    truncateText: true,
  },
  {
    field: 'description',
    name: 'Description',
    truncateText: true,
  },
  {
    field: 'filter',
    name: 'Filter',
    truncateText: true,
    render: (filter: System['filter']) => {
      return 'filter';
    },
  },
  {
    field: 'events',
    name: 'Event count',
    render: (online: System) => {
      const color = online ? 'success' : 'danger';
      const label = online ? 'Online' : 'Offline';
      return <EuiHealth color={color}>{label}</EuiHealth>;
    },
    sortable: true,
  },
  {
    name: 'Actions',
    actions: [
      {
        name: 'Clone',
        description: 'Clone this person',
        type: 'icon',
        icon: 'copy',
        onClick: () => '',
      },
    ],
  },
];

export function StreamSystemsTable({ systems }: { systems: System[] }) {
  /**
   * Expanding rows
   */
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, ReactNode>>(
    {}
  );

  const toggleDetails = (system: System) => {
    const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };

    if (itemIdToExpandedRowMapValues[system.name]) {
      delete itemIdToExpandedRowMapValues[system.name];
    } else {
      itemIdToExpandedRowMapValues[system.name] = <div> i am fine</div>;
    }
    setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
  };

  const columnsWithExpandingRowToggle: Array<EuiBasicTableColumn<System>> = [
    {
      align: 'right',
      width: '40px',
      isExpander: true,
      name: (
        <EuiScreenReaderOnly>
          <span>Expand row</span>
        </EuiScreenReaderOnly>
      ),
      mobileOptions: { header: false },
      render: (system: System) => {
        const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };

        return (
          <EuiButtonIcon
            onClick={() => toggleDetails(system)}
            aria-label={itemIdToExpandedRowMapValues[system.name] ? 'Collapse' : 'Expand'}
            iconType={itemIdToExpandedRowMapValues[system.name] ? 'arrowDown' : 'arrowRight'}
          />
        );
      },
    },
    ...columns,
  ];

  return (
    <EuiBasicTable
      tableCaption="Demo of EuiBasicTable with expanding rows"
      items={systems}
      itemId="name"
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      columns={columnsWithExpandingRowToggle}
      selection={{ initialSelected: [] }}
    />
  );
}
