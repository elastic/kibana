/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo, type ReactNode } from 'react';
import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiScreenReaderOnly,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import type { Streams, System } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { SystemDetailExpanded } from './system_detail_expanded';
import { TableTitle } from './table_title';
import { useStreamSystemsTable } from './hooks/use_stream_systems_table';

// Helper function to generate unique copy name
const generateCopyName = (originalName: string, existingSystems: System[]) => {
  const existingNames = new Set(existingSystems.map((s) => s.name));
  let copyNumber = 1;
  let copyName = `${originalName}-copy-${copyNumber}`;

  while (existingNames.has(copyName)) {
    copyNumber++;
    copyName = `${originalName}-copy-${copyNumber}`;
  }

  return copyName;
};

export function StreamSystemsTable({
  definition,
  systems,
  selectedSystemNames,
  setSelectedSystemNames,
  setSystems,
}: {
  definition: Streams.all.Definition;
  systems: System[];
  selectedSystemNames: Set<string>;
  setSelectedSystemNames: React.Dispatch<React.SetStateAction<Set<string>>>;
  setSystems: React.Dispatch<React.SetStateAction<System[]>>;
}) {
  const [expandedSystemNames, setExpandedSystemNames] = useState<Set<string>>(new Set());

  const itemIdToExpandedRowMap = useMemo(() => {
    const map: Record<string, ReactNode> = {};
    systems.forEach((s) => {
      if (expandedSystemNames.has(s.name)) {
        map[s.name] = <SystemDetailExpanded system={s} setSystems={setSystems} />;
      }
    });
    return map;
  }, [expandedSystemNames, systems, setSystems]);

  const selectedSystems = useMemo(() => {
    return systems.filter((s) => selectedSystemNames.has(s.name));
  }, [systems, selectedSystemNames]);

  const onSelectionChange = useCallback(
    (newSelectedSystems: System[]) => {
      setSelectedSystemNames(new Set(newSelectedSystems.map((s) => s.name)));
    },
    [setSelectedSystemNames]
  );

  const { nameColumn, filterColumn, eventsLast24HoursColumn } = useStreamSystemsTable({
    definition,
  });

  const columns: Array<EuiBasicTableColumn<System>> = [
    nameColumn,
    filterColumn,
    eventsLast24HoursColumn,
    {
      name: 'Actions',
      width: '5%',
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
          onClick: (system: System) => {
            setSystems((prev) =>
              prev.concat({ ...system, name: generateCopyName(system.name, systems) })
            );
          },
          'data-test-subj': 'system_identification_clone_system_button',
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
          onClick: (system: System) => {
            setExpandedSystemNames((prev) => new Set(prev).add(system.name));
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
          onClick: (system: System) => {
            setSystems(systems.filter((selectedSystem) => selectedSystem.name !== system.name));
            setSelectedSystemNames(
              new Set(
                Array.from(selectedSystemNames).filter(
                  (selectedSystemName) => selectedSystemName !== system.name
                )
              )
            );
            setExpandedSystemNames((prev) => {
              const next = new Set(prev);
              next.delete(system.name);
              return next;
            });
          },
        },
      ],
    },
  ];

  const toggleDetails = useCallback((system: System) => {
    setExpandedSystemNames((prev) => {
      const next = new Set(prev);
      if (next.has(system.name)) {
        next.delete(system.name);
      } else {
        next.add(system.name);
      }
      return next;
    });
  }, []);

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
        const isExpanded = expandedSystemNames.has(system.name);

        return (
          <EuiButtonIcon
            onClick={() => toggleDetails(system)}
            aria-label={
              isExpanded
                ? i18n.translate('xpack.streams.streamSystemsTable.columns.collapseDetails', {
                    defaultMessage: 'Collapse details',
                  })
                : i18n.translate('xpack.streams.streamSystemsTable.columns.expandDetails', {
                    defaultMessage: 'Expand details',
                  })
            }
            iconType={isExpanded ? 'arrowDown' : 'arrowRight'}
            data-test-subj={
              isExpanded
                ? 'system_identification_collapse_details_button'
                : 'system_identification_expand_details_button'
            }
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
        selection={{
          selected: selectedSystems,
          onSelectionChange,
        }}
      />
    </>
  );
}
