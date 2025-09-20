/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useState } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiCodeBlock } from '@elastic/eui';
import { EuiBasicTable, EuiButtonIcon, EuiScreenReaderOnly } from '@elastic/eui';
import { type System } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { SystemEventsSparkline } from './system_events_sparkline';
import { SystemDetailExpanded } from './system_detail_expanded';
import { TableTitle } from './table_title';

const columns: Array<EuiBasicTableColumn<System>> = [
  {
    field: 'title',
    name: i18n.translate('xpack.streams.streamSystemsTable.columns.title', {
      defaultMessage: 'Title',
    }),
    sortable: true,
    truncateText: true,
  },
  {
    field: 'description',
    name: i18n.translate('xpack.streams.streamSystemsTable.columns.description', {
      defaultMessage: 'Description',
    }),

    truncateText: true,
  },
  {
    field: 'filter',
    name: 'Filter',
    render: (filter: System['filter']) => {
      return <EuiCodeBlock>{JSON.stringify(filter)}</EuiCodeBlock>;
    },
  },
  {
    field: 'events',
    name: i18n.translate('xpack.streams.streamSystemsTable.columns.eventsLast24Hours', {
      defaultMessage: 'Events (last 24 hours)',
    }),
    render: (system: System) => {
      return <SystemEventsSparkline system={system} />;
    },
    sortable: true,
  },
  {
    name: 'Actions',
    actions: [
      {
        name: i18n.translate('xpack.streams.streamSystemsTable.columns.actions.cloneActionName', {
          defaultMessage: 'Clone',
        }),
        description: i18n.translate(
          'xpack.streams.streamSystemsTable.columns.actions.cloneActionDescription',
          { defaultMessage: 'Clone this system' }
        ),
        type: 'icon',
        icon: 'copy',
        onClick: () => '',
      },
      {
        name: i18n.translate('xpack.streams.streamSystemsTable.columns.actions.editActionName', {
          defaultMessage: 'Edit',
        }),
        description: i18n.translate(
          'xpack.streams.streamSystemsTable.columns.actions.editActionDescription',
          { defaultMessage: 'Edit this system' }
        ),
        type: 'icon',
        icon: 'pencil',
        onClick: () => '',
      },
      {
        name: i18n.translate('xpack.streams.streamSystemsTable.columns.actions.deleteActionName', {
          defaultMessage: 'Delete',
        }),
        description: i18n.translate(
          'xpack.streams.streamSystemsTable.columns.actions.deleteActionDescription',
          { defaultMessage: 'Delete this system' }
        ),
        type: 'icon',
        icon: 'trash',
        onClick: () => '',
      },
    ],
  },
];

export function StreamSystemsTable({
  systems,
  selectedSystems,
  setSelectedSystems,
}: {
  systems: System[];
  selectedSystems: System[];
  setSelectedSystems: React.Dispatch<React.SetStateAction<System[]>>;
}) {
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, ReactNode>>(
    {}
  );

  const toggleDetails = (system: System) => {
    const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };

    if (itemIdToExpandedRowMapValues[system.name]) {
      delete itemIdToExpandedRowMapValues[system.name];
    } else {
      itemIdToExpandedRowMapValues[system.name] = <SystemDetailExpanded system={system} />;
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
          <span>
            {i18n.translate('xpack.streams.streamSystemsTable.columns.expand', {
              defaultMessage: 'Expand row',
            })}
          </span>
        </EuiScreenReaderOnly>
      ),
      mobileOptions: { header: false },
      render: (system: System) => {
        const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };

        return (
          <EuiButtonIcon
            onClick={() => toggleDetails(system)}
            aria-label={
              itemIdToExpandedRowMapValues[system.name]
                ? i18n.translate('xpack.streams.streamSystemsTable.columns.collapseDetails', {
                    defaultMessage: 'Collapse details',
                  })
                : i18n.translate('xpack.streams.streamSystemsTable.columns.expandDetails', {
                    defaultMessage: 'Expand details',
                  })
            }
            iconType={itemIdToExpandedRowMapValues[system.name] ? 'arrowDown' : 'arrowRight'}
          />
        );
      },
    },
    ...columns,
  ];

  return (
    <>
      <TableTitle
        pageIndex={0}
        pageSize={10}
        total={systems.length}
        label={i18n.translate('xpack.streams.streamSystemsTable.tableTitle', {
          defaultMessage: 'Systems',
        })}
      />
      <EuiBasicTable
        tableCaption={i18n.translate('xpack.streams.streamSystemsTable.tableCaption', {
          defaultMessage: 'List of systems',
        })}
        items={systems}
        itemId="name"
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
        columns={columnsWithExpandingRowToggle}
        selection={{ initialSelected: selectedSystems, onSelectionChange: setSelectedSystems }}
      />
    </>
  );
}
