/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import {} from 'react';
import React, { useState } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBasicTable, EuiButtonIcon, EuiScreenReaderOnly } from '@elastic/eui';
import { type Streams, type System } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { ConditionPanel } from '../../shared';
import { SystemEventsSparkline } from './system_events_sparkline';
import { SystemDetailExpanded } from './system_detail_expanded';
import { TableTitle } from './table_title';

export function StreamSystemsTable({
  definition,
  systems: initialSystems,
  selectedSystems,
  setSelectedSystems,
}: {
  definition: Streams.all.Definition;
  systems: System[];
  selectedSystems: System[];
  setSelectedSystems: React.Dispatch<React.SetStateAction<System[]>>;
}) {
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, ReactNode>>(
    {}
  );

  const [systems, setSystems] = useState<System[]>(initialSystems);

  useEffect(() => {
    setSystems(initialSystems);
  }, [initialSystems]);

  const columns: Array<EuiBasicTableColumn<System>> = [
    {
      field: 'name',
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
      truncateText: {
        lines: 4,
      },
    },
    {
      field: 'filter',
      name: i18n.translate('xpack.streams.streamSystemsTable.columns.filter', {
        defaultMessage: 'Filter',
      }),
      render: (filter: System['filter']) => {
        return <ConditionPanel condition={filter} />;
      },
    },
    {
      name: i18n.translate('xpack.streams.streamSystemsTable.columns.eventsLast24Hours', {
        defaultMessage: 'Events (last 24 hours)',
      }),
      render: (system: System) => {
        return <SystemEventsSparkline system={system} definition={definition} />;
      },
    },
    {
      name: 'Actions',
      width: '100px',
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
          onClick: (system) => {
            // clone the system
            setSystems(systems.concat({ ...system, name: `${system.name}-copy` }));
          },
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
          onClick: (system) => {
            // open expanded row
            setItemIdToExpandedRowMap(
              Object.keys(itemIdToExpandedRowMap).includes(system.name)
                ? itemIdToExpandedRowMap
                : {
                    ...itemIdToExpandedRowMap,
                    [system.name]: <SystemDetailExpanded system={system} />,
                  }
            );
          },
        },
        {
          name: i18n.translate(
            'xpack.streams.streamSystemsTable.columns.actions.deleteActionName',
            {
              defaultMessage: 'Delete',
            }
          ),
          description: i18n.translate(
            'xpack.streams.streamSystemsTable.columns.actions.deleteActionDescription',
            { defaultMessage: 'Delete this system' }
          ),
          type: 'icon',
          icon: 'trash',
          onClick: (system) => {
            // delete the system
            setSystems(systems.filter((selectedSystem) => selectedSystem.name !== system.name));
            setSelectedSystems(
              selectedSystems.filter((selectedSystem) => selectedSystem.name !== system.name)
            );
            const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };
            if (itemIdToExpandedRowMapValues[system.name]) {
              delete itemIdToExpandedRowMapValues[system.name];
              setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
            }
          },
        },
      ],
    },
  ];

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
        selection={{ selected: selectedSystems, onSelectionChange: setSelectedSystems }}
      />
    </>
  );
}
