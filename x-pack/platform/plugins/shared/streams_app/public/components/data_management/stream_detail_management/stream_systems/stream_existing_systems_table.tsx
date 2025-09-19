/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiCodeBlock } from '@elastic/eui';
import { EuiBasicTable, EuiButtonIcon, EuiScreenReaderOnly } from '@elastic/eui';
import { type Streams, type System } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { StreamSystemDetailsFlyout } from './stream_system_details_flyout';
import { SystemEventsSparkline } from './system_events_sparkline';
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
    name: i18n.translate('xpack.streams.streamSystemsTable.columns.filter', {
      defaultMessage: 'Filter',
    }),
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

export function StreamExistingSystemsTable({
  isLoading,
  systems,
  definition,
  refreshSystems,
}: {
  isLoading?: boolean;
  systems: System[];
  definition: Streams.ClassicStream.GetResponse;
  refreshSystems: () => void;
}) {
  const [isDetailFlyoutOpen, setIsDetailFlyoutOpen] = useState<System>();

  const toggleDetails = (system: System) => {
    setIsDetailFlyoutOpen(system);
  };

  const columnsWithExpandingRowToggle: Array<EuiBasicTableColumn<System>> = [
    {
      align: 'right',
      width: '40px',
      isExpander: true,
      name: (
        <EuiScreenReaderOnly>
          <span>
            {i18n.translate('xpack.streams.streamSystemsTable.columns.openDetails', {
              defaultMessage: 'Open details',
            })}
          </span>
        </EuiScreenReaderOnly>
      ),
      render: (system: System) => {
        return (
          <EuiButtonIcon
            onClick={() => toggleDetails(system)}
            aria-label={
              isDetailFlyoutOpen
                ? i18n.translate('xpack.streams.streamSystemsTable.columns.collapseDetails', {
                    defaultMessage: 'Collapse details',
                  })
                : i18n.translate('xpack.streams.streamSystemsTable.columns.expandDetails', {
                    defaultMessage: 'Expand details',
                  })
            }
            iconType={isDetailFlyoutOpen ? 'minimize' : 'expand'}
          />
        );
      },
    },
    ...columns,
  ];

  return (
    <div css={{ padding: '16px' }}>
      <TableTitle
        pageIndex={0}
        pageSize={10}
        total={systems.length}
        label={i18n.translate('xpack.streams.streamSystemsTable.tableTitle', {
          defaultMessage: 'Systems',
        })}
      />
      <EuiBasicTable
        loading={isLoading}
        tableCaption={i18n.translate('xpack.streams.streamSystemsTable.tableCaption', {
          defaultMessage: 'List of systems',
        })}
        items={systems}
        itemId="name"
        columns={columnsWithExpandingRowToggle}
        selection={{ initialSelected: [] }}
      />
      {isDetailFlyoutOpen && (
        <StreamSystemDetailsFlyout
          definition={definition}
          system={isDetailFlyoutOpen}
          closeFlyout={() => {
            setIsDetailFlyoutOpen(undefined);
            refreshSystems();
          }}
        />
      )}
    </div>
  );
}
