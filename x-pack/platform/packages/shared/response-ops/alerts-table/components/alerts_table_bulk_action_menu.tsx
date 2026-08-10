/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenu } from '@elastic/eui';
import type { EuiContextMenuPanelItemDescriptor, IconType } from '@elastic/eui';
import type { Alert } from '@kbn/alerting-types';
import {
  ALERT_CASE_IDS,
  ALERT_WORKFLOW_ASSIGNEE_IDS,
  ALERT_WORKFLOW_TAGS,
} from '@kbn/rule-data-utils';
import React, { useMemo } from 'react';
import { useAlertsTableContext } from '../contexts/alerts_table_context';
import type { BulkActionsConfig, BulkActionsPanelConfig, TimelineItem } from '../types';
import { ADD_TO_CASE, CASE_TYPE } from '../translations';
import { AddToCaseActionPanel } from './add_to_case_action_panel';
import {
  BULK_ADD_TO_CASE_ACTION_IDS,
  BULK_ADD_TO_CHAT_ACTION_ID,
  BULK_EDIT_TAGS_ACTION_ID,
  BULK_MUTE_ACTION_IDS,
  BULK_UNTRACK_ACTION_ID,
} from '../hooks/use_bulk_actions';

interface AlertsTableBulkActionMenuProps {
  alerts: Alert[];
  clearSelection: () => void;
  closePopover: () => void;
  panels: BulkActionsPanelConfig[];
  refresh: () => void;
  setIsBulkActionsLoading: (loading: boolean) => void;
}

const ACTION_GROUP_ORDER = [
  ['status'],
  ['assignees', 'cases', 'tags'],
  ['timeline'],
  ['custom'],
  ['workflow'],
  ['chat'],
] as const;

const ACTION_GROUP_BY_ID: Readonly<Record<string, string>> = {
  [BULK_ADD_TO_CASE_ACTION_IDS.addToExistingCase]: 'cases',
  [BULK_ADD_TO_CASE_ACTION_IDS.addToNewCase]: 'cases',
  [BULK_ADD_TO_CHAT_ACTION_ID]: 'chat',
  [BULK_EDIT_TAGS_ACTION_ID]: 'tags',
  [BULK_MUTE_ACTION_IDS.mute]: 'status',
  [BULK_MUTE_ACTION_IDS.unmute]: 'status',
  [BULK_UNTRACK_ACTION_ID]: 'status',
};

const ACTION_ICONS_BY_ID: Readonly<Record<string, IconType>> = {
  [BULK_ADD_TO_CASE_ACTION_IDS.addToExistingCase]: 'briefcase',
  [BULK_ADD_TO_CASE_ACTION_IDS.addToNewCase]: 'briefcase',
  [BULK_ADD_TO_CHAT_ACTION_ID]: 'comment',
  [BULK_EDIT_TAGS_ACTION_ID]: 'tag',
  [BULK_MUTE_ACTION_IDS.mute]: 'bellSlash',
  [BULK_MUTE_ACTION_IDS.unmute]: 'bell',
  [BULK_UNTRACK_ACTION_ID]: 'eyeSlash',
};

const GROUP_SEPARATOR_TEST_ID = 'alertsTableBulkActionMenuGroupSeparator';
const ADD_TO_CASE_ACTION_ID = 'alerts-table-add-to-case';
const ADD_TO_CASE_PANEL_ID = 'alerts-table-add-to-case-panel';

const CASE_ACTION_IDS = new Set<string>([
  BULK_ADD_TO_CASE_ACTION_IDS.addToExistingCase,
  BULK_ADD_TO_CASE_ACTION_IDS.addToNewCase,
]);

const getGroupedItems = (
  items: BulkActionsConfig[],
  toMenuItem: (item: BulkActionsConfig) => EuiContextMenuPanelItemDescriptor,
  addToCaseItem?: EuiContextMenuPanelItemDescriptor
): EuiContextMenuPanelItemDescriptor[] => {
  const groups = new Map<string, EuiContextMenuPanelItemDescriptor[]>(
    ACTION_GROUP_ORDER.flatMap((groupIds) =>
      groupIds.map((groupId): [string, EuiContextMenuPanelItemDescriptor[]] => [groupId, []])
    )
  );

  if (addToCaseItem) {
    groups.get('cases')?.push(addToCaseItem);
  }

  items.forEach((item) => {
    const groupId = item.groupId ?? ACTION_GROUP_BY_ID[item.key] ?? 'custom';
    const groupItems = groups.get(groupId) ?? [];
    groupItems.push(toMenuItem(item));
    groups.set(groupId, groupItems);
  });

  const visibleGroups = ACTION_GROUP_ORDER.map((groupIds) => ({
    groupId: groupIds.join('-'),
    groupItems: groupIds.flatMap((groupId) => groups.get(groupId) ?? []),
  })).filter(({ groupItems }) => groupItems.length > 0);

  return visibleGroups.flatMap(({ groupId, groupItems }, index) => [
    ...groupItems,
    ...(index < visibleGroups.length - 1
      ? [
          {
            key: `separator-after-${groupId}`,
            isSeparator: true as const,
            'data-test-subj': GROUP_SEPARATOR_TEST_ID,
          },
        ]
      : []),
  ]);
};

const selectedIdsToTimelineItemMapper = (
  alerts: Alert[],
  selectedRowIndexes: Iterable<number>
): TimelineItem[] =>
  Array.from(selectedRowIndexes).map((rowIndex) => {
    const alert = alerts[rowIndex];
    const data = Object.entries({
      [ALERT_CASE_IDS]: null,
      [ALERT_WORKFLOW_TAGS]: null,
      [ALERT_WORKFLOW_ASSIGNEE_IDS]: null,
      ...alert,
    }).map(([key, value]) => ({
      field: key,
      value: value ? (value as string[]) : [],
    }));

    return {
      _id: alert._id,
      _index: alert._index,
      data,
      ecs: {
        _id: alert._id,
        _index: alert._index,
      },
    };
  });

export const AlertsTableBulkActionMenu = ({
  alerts,
  clearSelection,
  closePopover,
  panels,
  refresh,
  setIsBulkActionsLoading,
}: AlertsTableBulkActionMenuProps) => {
  const {
    bulkActionsStore: [{ isAllSelected, rowSelection }],
  } = useAlertsTableContext();

  const menuPanels = useMemo(() => {
    const selectedAlertItems = selectedIdsToTimelineItemMapper(alerts, rowSelection.keys());
    const runAction = (item: BulkActionsConfig) => {
      closePopover();
      item.onClick?.(
        selectedAlertItems,
        isAllSelected,
        setIsBulkActionsLoading,
        clearSelection,
        refresh
      );
    };
    const initialPanel = panels.find((panel) => panel.id === 0 && panel.items);
    const caseActions = initialPanel?.items?.filter(({ key }) => CASE_ACTION_IDS.has(key)) ?? [];
    const addToCaseItem: EuiContextMenuPanelItemDescriptor | undefined =
      caseActions.length > 0
        ? {
            key: ADD_TO_CASE_ACTION_ID,
            'data-test-subj': ADD_TO_CASE_ACTION_ID,
            disabled: caseActions.every((item) => isAllSelected && item.disableOnQuery),
            icon: 'briefcase',
            name: ADD_TO_CASE,
            panel: ADD_TO_CASE_PANEL_ID,
          }
        : undefined;

    const mappedPanels = panels.map((panel) => {
      if (panel.items) {
        const toMenuItem = (item: BulkActionsConfig): EuiContextMenuPanelItemDescriptor => {
          const isDisabled = isAllSelected && item.disableOnQuery;

          return {
            key: item.key,
            'data-test-subj': item['data-test-subj'],
            disabled: isDisabled,
            onClick: item.onClick ? () => runAction(item) : undefined,
            name: isDisabled && item.disabledLabel ? item.disabledLabel : item.label,
            panel: item.panel,
            icon: item.icon ?? ACTION_ICONS_BY_ID[item.key],
          };
        };
        const nonCaseItems = panel.items.filter(({ key }) => !CASE_ACTION_IDS.has(key));
        const items =
          panel.id === 0
            ? getGroupedItems(nonCaseItems, toMenuItem, addToCaseItem)
            : panel.items.map(toMenuItem);

        return { ...panel, items };
      }

      return {
        ...panel,
        content: panel.renderContent({
          alertItems: selectedAlertItems,
          isAllSelected,
          setIsBulkActionsLoading,
          clearSelection,
          refresh,
          closePopoverMenu: closePopover,
        }),
      };
    });

    return caseActions.length > 0
      ? [
          ...mappedPanels,
          {
            id: ADD_TO_CASE_PANEL_ID,
            title: CASE_TYPE,
            content: (
              <AddToCaseActionPanel
                actions={caseActions.map((action) => ({
                  id: action.key,
                  label: action.label,
                  dataTestSubj: action['data-test-subj'],
                  disabled: isAllSelected && action.disableOnQuery,
                  onClick: () => runAction(action),
                }))}
              />
            ),
          },
        ]
      : mappedPanels;
  }, [
    alerts,
    clearSelection,
    closePopover,
    isAllSelected,
    panels,
    refresh,
    rowSelection,
    setIsBulkActionsLoading,
  ]);

  return (
    <EuiContextMenu
      initialPanelId={0}
      panels={menuPanels}
      data-test-subj="alertsTableBulkActionMenu"
    />
  );
};
