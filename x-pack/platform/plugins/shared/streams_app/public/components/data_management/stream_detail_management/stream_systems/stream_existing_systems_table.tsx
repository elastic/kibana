/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiHorizontalRule,
  EuiSpacer,
  EuiButtonEmpty,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
} from '@elastic/eui';
import { EuiButtonIcon, EuiScreenReaderOnly } from '@elastic/eui';
import { type Streams, type System } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { ConditionPanel } from '../../shared';
import { useStreamsAppRouter } from '../../../../hooks/use_streams_app_router';
import { useStreamSystemsApi } from '../../../../hooks/use_stream_systems_api';
import { StreamSystemDetailsFlyout } from './stream_system_details_flyout';
import { SystemEventsSparkline } from './system_events_sparkline';
import { TableTitle } from './table_title';

export function StreamExistingSystemsTable({
  isLoading,
  systems,
  definition,
  refreshSystems,
}: {
  isLoading?: boolean;
  systems: System[];
  definition: Streams.all.Definition;
  refreshSystems: () => void;
}) {
  const router = useStreamsAppRouter();

  const [isDetailFlyoutOpen, setIsDetailFlyoutOpen] = useState<System>();
  const [selectedSystems, setSelectedSystems] = useState<System[]>([]);
  const { removeSystemsFromStream } = useStreamSystemsApi(definition);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(5);

  const columns: Array<EuiBasicTableColumn<System>> = [
    {
      field: 'name',
      name: TITLE_LABEL,
      sortable: true,
      truncateText: true,
    },
    {
      field: 'description',
      name: DESCRIPTION_LABEL,
      truncateText: {
        lines: 4,
      },
    },
    {
      field: 'filter',
      name: FILTER_LABEL,
      render: (filter: System['filter']) => {
        return <ConditionPanel condition={filter} />;
      },
    },
    {
      name: EVENTS_LAST_24_HOURS_LABEL,
      render: (system: System) => {
        return <SystemEventsSparkline system={system} definition={definition} />;
      },
    },
    {
      name: ACTIONS_COLUMN_HEADER_LABEL,
      width: '120px',
      actions: [
        {
          name: GENERATE_SIGNIFICANT_EVENTS,
          description: GENERATE_SIGNIFICANT_EVENTS,
          type: 'icon',
          icon: 'plusInSquare',
          onClick: () => '',
        },
        {
          name: EDIT_ACTION_NAME_LABEL,
          description: EDIT_ACTION_DESCRIPTION_LABEL,
          type: 'icon',
          icon: 'pencil',
          onClick: (system) => {
            setIsDetailFlyoutOpen(system);
          },
        },
        {
          name: DELETE_ACTION_NAME_LABEL,
          description: DELETE_ACTION_DESCRIPTION_LABEL,
          type: 'icon',
          icon: 'trash',
          onClick: (system) => {
            setIsDeleting(true);
            removeSystemsFromStream([system.name])
              .then(() => {
                refreshSystems();
              })
              .finally(() => {
                setIsDeleting(false);
              });
          },
        },
      ],
    },
  ];

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
          <span>{OPEN_DETAILS_LABEL}</span>
        </EuiScreenReaderOnly>
      ),
      render: (system: System) => {
        return (
          <EuiButtonIcon
            onClick={() => toggleDetails(system)}
            aria-label={isDetailFlyoutOpen ? COLLAPSE_DETAILS_LABEL : EXPAND_DETAILS_LABEL}
            iconType={isDetailFlyoutOpen ? 'minimize' : 'expand'}
          />
        );
      },
    },
    ...columns,
  ];

  return (
    <div css={{ padding: '16px' }}>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <TableTitle
            pageIndex={pageIndex}
            pageSize={pageSize}
            total={systems.length}
            label={SYSTEMS_LABEL}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink
            href={router.link('/{key}/management/{tab}', {
              path: { key: definition.name, tab: 'significantEvents' },
            })}
          >
            <EuiButtonEmpty
              disabled={systems.length === 0}
              iconType="popout"
              aria-label={GENERATE_SIGNIFICANT_EVENTS}
            >
              {GENERATE_SIGNIFICANT_EVENTS}
            </EuiButtonEmpty>
          </EuiLink>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="cross"
            aria-label={CLEAR_SELECTION}
            isDisabled={selectedSystems.length === 0 || isLoading}
            onClick={() => {
              setSelectedSystems([]);
            }}
          >
            {CLEAR_SELECTION}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            isLoading={isDeleting}
            iconType="trash"
            color="danger"
            aria-label={DELETE_ALL}
            isDisabled={selectedSystems.length === 0 || isLoading}
            onClick={() => {
              setIsDeleting(true);
              removeSystemsFromStream(selectedSystems.map((s) => s.name))
                .then(() => {
                  removeSystemsFromStream(selectedSystems.map((s) => s.name)).finally(() => {
                    setSelectedSystems([]);
                  });
                })
                .finally(() => {
                  refreshSystems();
                  setIsDeleting(false);
                });
            }}
          >
            {DELETE_ALL}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiHorizontalRule margin="none" style={{ height: 2 }} />
      <EuiInMemoryTable
        loading={isLoading}
        tableCaption={TABLE_CAPTION_LABEL}
        items={systems}
        itemId="name"
        columns={columnsWithExpandingRowToggle}
        selection={{
          initialSelected: selectedSystems,
          onSelectionChange: setSelectedSystems,
          selected: selectedSystems,
        }}
        pagination={{
          pageSize,
          pageSizeOptions: [5, 10, 25],
          onChangePage: (pIndex) => {
            setPageIndex(pIndex);
          },
          onChangeItemsPerPage: (pSize) => {
            setPageSize(pSize);
            setPageIndex(0);
          },
        }}
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

const DELETE_ALL = i18n.translate(
  'xpack.streams.streamSystemsTable.columns.actions.deleteSelection',
  {
    defaultMessage: 'Delete selected',
  }
);

const GENERATE_SIGNIFICANT_EVENTS = i18n.translate(
  'xpack.streams.streamSystemsTable.columns.actions.generate',
  { defaultMessage: 'Generate significant events' }
);

// i18n labels moved to end of file
const TITLE_LABEL = i18n.translate('xpack.streams.streamSystemsTable.columns.title', {
  defaultMessage: 'Title',
});

const DESCRIPTION_LABEL = i18n.translate('xpack.streams.streamSystemsTable.columns.description', {
  defaultMessage: 'Description',
});

const FILTER_LABEL = i18n.translate('xpack.streams.streamSystemsTable.columns.filter', {
  defaultMessage: 'Filter',
});

const EVENTS_LAST_24_HOURS_LABEL = i18n.translate(
  'xpack.streams.streamSystemsTable.columns.eventsLast24Hours',
  {
    defaultMessage: 'Events (last 24 hours)',
  }
);

const ACTIONS_COLUMN_HEADER_LABEL = i18n.translate(
  'xpack.streams.streamSystemsTable.columns.actionsColumnHeader',
  {
    defaultMessage: 'Actions',
  }
);

const EDIT_ACTION_NAME_LABEL = i18n.translate(
  'xpack.streams.streamSystemsTable.columns.actions.editActionName',
  {
    defaultMessage: 'Edit',
  }
);

const EDIT_ACTION_DESCRIPTION_LABEL = i18n.translate(
  'xpack.streams.streamSystemsTable.columns.actions.editActionDescription',
  { defaultMessage: 'Edit this system' }
);

const DELETE_ACTION_NAME_LABEL = i18n.translate(
  'xpack.streams.streamSystemsTable.columns.actions.deleteActionName',
  {
    defaultMessage: 'Delete',
  }
);

const DELETE_ACTION_DESCRIPTION_LABEL = i18n.translate(
  'xpack.streams.streamSystemsTable.columns.actions.deleteActionDescription',
  { defaultMessage: 'Delete this system' }
);

const OPEN_DETAILS_LABEL = i18n.translate('xpack.streams.streamSystemsTable.columns.openDetails', {
  defaultMessage: 'Open details',
});

const COLLAPSE_DETAILS_LABEL = i18n.translate(
  'xpack.streams.streamSystemsTable.columns.collapseDetails',
  {
    defaultMessage: 'Collapse details',
  }
);

const EXPAND_DETAILS_LABEL = i18n.translate(
  'xpack.streams.streamSystemsTable.columns.expandDetails',
  {
    defaultMessage: 'Expand details',
  }
);

const SYSTEMS_LABEL = i18n.translate('xpack.streams.streamSystemsTable.tableTitle', {
  defaultMessage: 'Systems',
});

const TABLE_CAPTION_LABEL = i18n.translate('xpack.streams.streamSystemsTable.tableCaption', {
  defaultMessage: 'List of systems',
});
