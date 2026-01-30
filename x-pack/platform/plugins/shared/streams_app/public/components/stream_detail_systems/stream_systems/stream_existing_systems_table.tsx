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
import type { Streams, System } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import type { AIFeatures } from '../../../hooks/use_ai_features';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { useStreamSystemsApi } from '../../../hooks/use_stream_systems_api';
import { useTimeRange } from '../../../hooks/use_time_range';
import { StreamSystemDetailsFlyout } from './stream_system_details_flyout';
import { TableTitle } from './table_title';
import { useStreamSystemsTable } from './hooks/use_stream_systems_table';

export function StreamExistingSystemsTable({
  isLoading,
  systems,
  definition,
  refreshSystems,
  aiFeatures,
}: {
  isLoading?: boolean;
  systems: System[];
  definition: Streams.all.Definition;
  refreshSystems: () => void;
  aiFeatures: AIFeatures | null;
}) {
  const router = useStreamsAppRouter();
  const { rangeFrom, rangeTo } = useTimeRange();

  const [selectedSystem, setSelectedSystem] = useState<System>();
  const [selectedSystems, setSelectedSystems] = useState<System[]>([]);
  const { removeSystemsFromStream } = useStreamSystemsApi(definition);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const { nameColumn, filterColumn, eventsLast24HoursColumn } = useStreamSystemsTable({
    definition,
  });

  const goToGenerateSignificantEvents = (significantEventsSystems: System[]) => {
    router.push('/{key}/management/{tab}', {
      path: { key: definition.name, tab: 'significantEvents' },
      query: {
        rangeFrom,
        rangeTo,
        openFlyout: 'true',
        selectedSystems: significantEventsSystems.map((s) => s.name).join(','),
      },
    });
  };

  const columns: Array<EuiBasicTableColumn<System>> = [
    nameColumn,
    filterColumn,
    eventsLast24HoursColumn,
    {
      name: ACTIONS_COLUMN_HEADER_LABEL,
      width: '5%',
      actions: [
        {
          name: GENERATE_SIGNIFICANT_EVENTS,
          description: GENERATE_SIGNIFICANT_EVENTS,
          type: 'icon',
          icon: 'crosshairs',
          enabled: () => (aiFeatures?.genAiConnectors.selectedConnector ? true : false),
          onClick: (system) => {
            goToGenerateSignificantEvents([system]);
          },
          'data-test-subj': 'system_identification_single_goto_significant_events_button',
        },
        {
          name: EDIT_ACTION_NAME_LABEL,
          description: EDIT_ACTION_DESCRIPTION_LABEL,
          type: 'icon',
          icon: 'pencil',
          'data-test-subj': 'system_identification_existing_start_edit_button',
          onClick: (system) => {
            setSelectedSystem(system);
          },
        },
        {
          name: DELETE_ACTION_NAME_LABEL,
          description: DELETE_ACTION_DESCRIPTION_LABEL,
          type: 'icon',
          icon: 'trash',
          color: 'danger',
          onClick: (system: System) => {
            setIsDeleting(true);
            removeSystemsFromStream([system])
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
    setSelectedSystem(system);
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
            aria-label={selectedSystem ? COLLAPSE_DETAILS_LABEL : EXPAND_DETAILS_LABEL}
            iconType={selectedSystem ? 'minimize' : 'expand'}
          />
        );
      },
    },
    ...columns,
  ];

  const isGenerateSignificantEventsButtonDisabled =
    selectedSystems.length === 0 || !aiFeatures?.genAiConnectors.selectedConnector;

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
            onClick={() => {
              goToGenerateSignificantEvents(selectedSystems);
            }}
          >
            <EuiButtonEmpty
              disabled={isGenerateSignificantEventsButtonDisabled}
              iconType="crosshairs"
              size="xs"
              aria-label={GENERATE_SIGNIFICANT_EVENTS}
              data-test-subj="system_identification_selection_goto_significant_events_button"
            >
              {GENERATE_SIGNIFICANT_EVENTS}
            </EuiButtonEmpty>
          </EuiLink>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="cross"
            size="xs"
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
            size="xs"
            iconType="trash"
            color="danger"
            aria-label={DELETE_ALL}
            isDisabled={selectedSystems.length === 0 || isLoading}
            onClick={() => {
              setIsDeleting(true);
              removeSystemsFromStream(selectedSystems)
                .then(() => {
                  setSelectedSystems([]);
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
        noItemsMessage={i18n.translate('xpack.streams.streamSystemsTable.noSystemsMessage', {
          defaultMessage: 'No systems found',
        })}
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
      {selectedSystem && (
        <StreamSystemDetailsFlyout
          definition={definition}
          system={selectedSystem}
          closeFlyout={() => {
            setSelectedSystem(undefined);
          }}
          refreshSystems={refreshSystems}
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
