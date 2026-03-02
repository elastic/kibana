/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { EuiDataGridControlColumn, EuiDataGridCellValueElementProps } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RowControlColumn, DataTableRecord } from '@kbn/discover-utils';
import { FilterStateStore } from '@kbn/es-query';
import type { OsqueryTimelinesStart } from '../types';
import { SECURITY_APP_NAME } from '../timelines/add_to_timeline_button';
import { useKibana } from '../common/lib/kibana';
import { useLogsDataView } from '../common/hooks/use_logs_data_view';
import { getLensAttributes } from '../packs/pack_queries_status_table';
import { AddToCaseWrapper } from '../cases/add_to_cases';

interface RowActionsOptions {
  timelines: OsqueryTimelinesStart | undefined;
  appName: string;
  liveQueryActionId: string | undefined;
  agentIds: string[] | undefined;
  actionId: string;
  endDate: string | undefined;
  startDate: string | undefined;
  startServices: {
    analytics: unknown;
    i18n: unknown;
    theme: unknown;
  };
}

const ACTIONS_LABEL = i18n.translate('xpack.osquery.resultsTable.rowAction.actions', {
  defaultMessage: 'Actions',
});

const VIEW_IN_DISCOVER_LABEL = i18n.translate(
  'xpack.osquery.resultsTable.rowAction.viewInDiscover',
  { defaultMessage: 'View in Discover' }
);

const VIEW_IN_LENS_LABEL = i18n.translate('xpack.osquery.resultsTable.rowAction.viewInLens', {
  defaultMessage: 'View in Lens',
});

const ADD_TO_TIMELINE_LABEL = i18n.translate(
  'xpack.osquery.resultsTable.rowAction.addToTimeline',
  { defaultMessage: 'Add to Timeline' }
);

const ADD_TO_CASE_LABEL = i18n.translate('xpack.osquery.resultsTable.rowAction.addToCase', {
  defaultMessage: 'Add to Case',
});

const COPY_ID_LABEL = i18n.translate('xpack.osquery.resultsTable.rowAction.copyId', {
  defaultMessage: 'Copy ID',
});

const COPIED_ID_LABEL = i18n.translate('xpack.osquery.resultsTable.rowAction.copiedId', {
  defaultMessage: 'Action ID copied to clipboard',
});

interface RowActionsPopoverProps {
  Control: React.ComponentType<{
    iconType: string;
    label: string;
    onClick: () => void;
    'data-test-subj'?: string;
  }>;
  record: DataTableRecord;
  actionId: string;
  endDate: string | undefined;
  startDate: string | undefined;
  timelines: OsqueryTimelinesStart | undefined;
  appName: string;
  liveQueryActionId: string | undefined;
  agentIds: string[] | undefined;
  startServices: {
    analytics: unknown;
    i18n: unknown;
    theme: unknown;
  };
}

const RowActionsPopoverComponent: React.FC<RowActionsPopoverProps> = ({
  Control,
  record,
  actionId,
  endDate,
  startDate,
  timelines,
  appName,
  liveQueryActionId,
  agentIds,
  startServices,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    discover,
    application,
    lens: lensService,
    notifications: { toasts },
  } = useKibana().services;

  const locator = discover?.locator;
  const discoverPermissions = application.capabilities.discover_v2;
  const isLensAvailable = lensService?.canUseEditor();
  const { data: logsDataView } = useLogsDataView({ skip: !actionId, checkOnly: true });

  const [discoverUrl, setDiscoverUrl] = useState<string>('');

  useEffect(() => {
    const getDiscoverUrl = async () => {
      if (!locator || !logsDataView) return;

      const newUrl = await locator.getUrl({
        indexPatternId: logsDataView.id,
        filters: [
          {
            meta: {
              index: logsDataView.id,
              alias: null,
              negate: false,
              disabled: false,
              type: 'phrase',
              key: 'action_id',
              params: { query: actionId },
            },
            query: { match_phrase: { action_id: actionId } },
            $state: { store: FilterStateStore.APP_STATE },
          },
        ],
        refreshInterval: { pause: true, value: 0 },
        timeRange:
          startDate && endDate
            ? { to: endDate, from: startDate, mode: 'absolute' }
            : { to: 'now', from: 'now-1d', mode: 'relative' },
      });
      setDiscoverUrl(newUrl);
    };

    getDiscoverUrl();
  }, [actionId, endDate, startDate, locator, logsDataView]);

  const togglePopover = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const closePopover = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleViewInDiscover = useCallback(() => {
    if (discoverUrl) {
      window.open(discoverUrl, '_blank');
    }
    closePopover();
  }, [closePopover, discoverUrl]);

  const handleViewInLens = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      if (logsDataView?.id) {
        lensService?.navigateToPrefilledEditor(
          {
            id: '',
            timeRange: {
              from: startDate ?? 'now-1d',
              to: endDate ?? 'now',
              mode: (startDate || endDate) ? 'absolute' : 'relative',
            },
            attributes: getLensAttributes(logsDataView, actionId),
          },
          { openInNewTab: true, skipAppLeave: true }
        );
      }
      closePopover();
    },
    [actionId, closePopover, endDate, lensService, logsDataView, startDate]
  );

  const handleAddToTimeline = useCallback(() => {
    if (!timelines) return;

    const { getAddToTimelineButton } = timelines.getHoverActions();
    const providers = [
      {
        and: [],
        enabled: true,
        excluded: false,
        id: record.id,
        kqlQuery: '',
        name: record.id,
        queryMatch: {
          field: '_id',
          value: record.id,
          operator: ':' as const,
        },
      },
    ];

    const button = getAddToTimelineButton({
      dataProvider: providers,
      field: record.id,
      ownFocus: false,
      showTooltip: false,
      startServices,
    });

    if (button && React.isValidElement(button)) {
      const onClick = (button.props as { onClick?: () => void })?.onClick;
      onClick?.();
    }
    closePopover();
  }, [closePopover, record.id, startServices, timelines]);

  const handleCopyId = useCallback(() => {
    navigator.clipboard.writeText(actionId);
    toasts.addSuccess({ title: COPIED_ID_LABEL });
    closePopover();
  }, [actionId, closePopover, toasts]);

  const items = useMemo(() => {
    const menuItems: React.ReactElement[] = [];

    if (discoverPermissions?.show) {
      menuItems.push(
        <EuiContextMenuItem
          key="discover"
          icon="discoverApp"
          onClick={handleViewInDiscover}
          disabled={!logsDataView}
          data-test-subj="osquery-row-action-discover"
        >
          {VIEW_IN_DISCOVER_LABEL}
        </EuiContextMenuItem>
      );
    }

    if (isLensAvailable) {
      menuItems.push(
        <EuiContextMenuItem
          key="lens"
          icon="lensApp"
          onClick={handleViewInLens}
          disabled={!logsDataView}
          data-test-subj="osquery-row-action-lens"
        >
          {VIEW_IN_LENS_LABEL}
        </EuiContextMenuItem>
      );
    }

    if (timelines && appName === SECURITY_APP_NAME) {
      menuItems.push(
        <EuiContextMenuItem
          key="timeline"
          icon="timeline"
          onClick={handleAddToTimeline}
          data-test-subj="osquery-row-action-timeline"
        >
          {ADD_TO_TIMELINE_LABEL}
        </EuiContextMenuItem>
      );
    }

    if (liveQueryActionId) {
      menuItems.push(
        <EuiContextMenuItem
          key="case"
          icon="casesApp"
          data-test-subj="osquery-row-action-case"
        >
          <AddToCaseWrapper
            actionId={liveQueryActionId}
            queryId={actionId}
            agentIds={agentIds}
          />
        </EuiContextMenuItem>
      );
    }

    menuItems.push(
      <EuiContextMenuItem
        key="copyId"
        icon="copyClipboard"
        onClick={handleCopyId}
        data-test-subj="osquery-row-action-copy-id"
      >
        {COPY_ID_LABEL}
      </EuiContextMenuItem>
    );

    return menuItems;
  }, [
    actionId,
    agentIds,
    appName,
    discoverPermissions?.show,
    handleAddToTimeline,
    handleCopyId,
    handleViewInDiscover,
    handleViewInLens,
    isLensAvailable,
    liveQueryActionId,
    logsDataView,
    timelines,
  ]);

  const button = useMemo(
    () => (
      <Control
        iconType="boxesHorizontal"
        label={ACTIONS_LABEL}
        onClick={togglePopover}
        data-test-subj="osquery-row-actions-trigger"
      />
    ),
    [Control, togglePopover]
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel size="s" items={items} />
    </EuiPopover>
  );
};

RowActionsPopoverComponent.displayName = 'RowActionsPopover';

const RowActionsPopover = React.memo(RowActionsPopoverComponent);

export function useOsqueryRowActions({
  timelines,
  appName,
  liveQueryActionId,
  agentIds,
  actionId,
  endDate,
  startDate,
  startServices,
}: RowActionsOptions): RowControlColumn[] {
  return useMemo(
    () => [
      {
        id: 'osquery-row-actions',
        render: (Control: React.ComponentType<any>, { record }: { record: DataTableRecord }) => (
          <RowActionsPopover
            Control={Control}
            record={record}
            actionId={actionId}
            endDate={endDate}
            startDate={startDate}
            timelines={timelines}
            appName={appName}
            liveQueryActionId={liveQueryActionId}
            agentIds={agentIds}
            startServices={startServices}
          />
        ),
      },
    ],
    [actionId, agentIds, appName, endDate, liveQueryActionId, startDate, startServices, timelines]
  );
}

interface TrailingKebabCellProps {
  rowIndex: number;
  rows: DataTableRecord[];
  actionId: string;
  endDate: string | undefined;
  startDate: string | undefined;
  timelines: OsqueryTimelinesStart | undefined;
  appName: string;
  liveQueryActionId: string | undefined;
  agentIds: string[] | undefined;
  startServices: { analytics: unknown; i18n: unknown; theme: unknown };
}

const TrailingKebabCell: React.FC<TrailingKebabCellProps> = ({
  rowIndex,
  rows,
  actionId,
  endDate,
  startDate,
  timelines,
  appName,
  liveQueryActionId,
  agentIds,
  startServices,
}) => {
  const record = rows[rowIndex];
  if (!record) return null;

  const ButtonControl: React.ComponentType<{
    iconType: string;
    label: string;
    onClick: () => void;
    'data-test-subj'?: string;
  }> = ({ iconType, label, onClick, ...rest }) => (
    <EuiButtonIcon iconType={iconType} aria-label={label} onClick={onClick} size="xs" {...rest} />
  );

  return (
    <RowActionsPopover
      Control={ButtonControl}
      record={record}
      actionId={actionId}
      endDate={endDate}
      startDate={startDate}
      timelines={timelines}
      appName={appName}
      liveQueryActionId={liveQueryActionId}
      agentIds={agentIds}
      startServices={startServices}
    />
  );
};

export function useOsqueryTrailingColumns({
  timelines,
  appName,
  liveQueryActionId,
  agentIds,
  actionId,
  endDate,
  startDate,
  startServices,
  rows,
}: RowActionsOptions & { rows: DataTableRecord[] }): EuiDataGridControlColumn[] {
  return useMemo(
    () => [
      {
        id: 'osquery-trailing-actions',
        width: 40,
        headerCellRender: () => null,
        rowCellRender: ({ rowIndex }: EuiDataGridCellValueElementProps) => (
          <TrailingKebabCell
            rowIndex={rowIndex}
            rows={rows}
            actionId={actionId}
            endDate={endDate}
            startDate={startDate}
            timelines={timelines}
            appName={appName}
            liveQueryActionId={liveQueryActionId}
            agentIds={agentIds}
            startServices={startServices}
          />
        ),
      },
    ],
    [
      actionId,
      agentIds,
      appName,
      endDate,
      liveQueryActionId,
      rows,
      startDate,
      startServices,
      timelines,
    ]
  );
}
