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
  'cases',
  'status',
  'workflow',
  'tags',
  'assignees',
  'timeline',
  'custom',
  'chat',
] as const;

const ACTION_GROUP_BY_ID: Readonly<Record<string, (typeof ACTION_GROUP_ORDER)[number]>> = {
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

const getGroupedItems = (
  items: BulkActionsConfig[],
  toMenuItem: (item: BulkActionsConfig) => EuiContextMenuPanelItemDescriptor
): EuiContextMenuPanelItemDescriptor[] => {
  const groups = new Map<string, EuiContextMenuPanelItemDescriptor[]>(
    ACTION_GROUP_ORDER.map((groupId) => [groupId, []])
  );

  items.forEach((item) => {
    const groupId = item.groupId ?? ACTION_GROUP_BY_ID[item.key] ?? 'custom';
    const groupItems = groups.get(groupId) ?? [];
    groupItems.push(toMenuItem(item));
    groups.set(groupId, groupItems);
  });

  const visibleGroups = Array.from(groups.entries()).filter(
    ([, groupItems]) => groupItems.length > 0
  );

  return visibleGroups.flatMap(([groupId, groupItems], index) => [
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

    return panels.map((panel) => {
      if (panel.items) {
        const toMenuItem = (item: BulkActionsConfig): EuiContextMenuPanelItemDescriptor => {
          const isDisabled = isAllSelected && item.disableOnQuery;

          return {
            key: item.key,
            'data-test-subj': item['data-test-subj'],
            disabled: isDisabled,
            onClick: item.onClick
              ? () => {
                  closePopover();
                  item.onClick?.(
                    selectedAlertItems,
                    isAllSelected,
                    setIsBulkActionsLoading,
                    clearSelection,
                    refresh
                  );
                }
              : undefined,
            name: isDisabled && item.disabledLabel ? item.disabledLabel : item.label,
            panel: item.panel,
            icon: item.icon ?? ACTION_ICONS_BY_ID[item.key],
          };
        };
        const items =
          panel.id === 0 ? getGroupedItems(panel.items, toMenuItem) : panel.items.map(toMenuItem);

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
