/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiButtonEmpty } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { EuiCodeBlock } from '@elastic/eui';
import { EuiBasicTable, EuiButtonIcon, EuiScreenReaderOnly } from '@elastic/eui';
import { type Streams, type System } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { StreamSystemDetailsFlyout } from './stream_system_details_flyout';
import { SystemEventsSparkline } from './system_events_sparkline';
import { TableTitle } from './table_title';
const GENERATE_SIGNIFICANT_EVENTS = i18n.translate(
  'xpack.streams.streamSystemsTable.columns.actions.generate',
  { defaultMessage: 'Generate significant events' }
);

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
    name: i18n.translate('xpack.streams.streamSystemsTable.columns.actionsColumnHeader', {
      defaultMessage: 'Actions',
    }),
    actions: [
      {
        name: GENERATE_SIGNIFICANT_EVENTS,
        description: GENERATE_SIGNIFICANT_EVENTS,
        type: 'icon',
        icon: 'plusInSquare',
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
  const [selectedSystems, setSelectedSystems] = useState<System[]>([]);

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
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <TableTitle
            pageIndex={0}
            pageSize={10}
            total={systems.length}
            label={i18n.translate('xpack.streams.streamSystemsTable.tableTitle', {
              defaultMessage: 'Systems',
            })}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="plusInSquare"
            aria-label={GENERATE_SIGNIFICANT_EVENTS}
            isDisabled={selectedSystems.length === 0}
          >
            {GENERATE_SIGNIFICANT_EVENTS}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="cross"
            aria-label={CLEAR_SELECTION}
            isDisabled={selectedSystems.length === 0}
          >
            {CLEAR_SELECTION}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="trash"
            color="danger"
            aria-label={DELETE_ALL}
            isDisabled={selectedSystems.length === 0}
          >
            {DELETE_ALL}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiBasicTable
        loading={isLoading}
        tableCaption={i18n.translate('xpack.streams.streamSystemsTable.tableCaption', {
          defaultMessage: 'List of systems',
        })}
        items={systems}
        itemId="name"
        columns={columnsWithExpandingRowToggle}
        selection={{ initialSelected: selectedSystems, onSelectionChange: setSelectedSystems }}
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

const CLEAR_SELECTION = i18n.translate(
  'xpack.streams.streamSystemsTable.columns.actions.clearSelection',
  { defaultMessage: 'Clear selection' }
);

const DELETE_ALL = i18n.translate('xpack.streams.streamSystemsTable.columns.actions.deleteAll', {
  defaultMessage: 'Delete all',
});
