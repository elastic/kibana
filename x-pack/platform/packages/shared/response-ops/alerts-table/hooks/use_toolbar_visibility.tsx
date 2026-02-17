/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EuiDataGridToolBarAdditionalControlsOptions,
  EuiDataGridToolBarVisibilityOptions,
} from '@elastic/eui';
import { useEuiTheme } from '@elastic/eui';
import type { ReactNode } from 'react';
import React, { lazy, memo, Suspense, useMemo } from 'react';
import type { Alert, BrowserFields, EsQuerySnapshot } from '@kbn/alerting-types';
import type { FieldBrowserOptions } from '@kbn/response-ops-alerts-fields-browser';
import { FieldBrowser } from '@kbn/response-ops-alerts-fields-browser';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import { css } from '@emotion/react';
import { AlertsCount } from '../components/alerts_count';
import { useAlertsTableContext } from '../contexts/alerts_table_context';
import type { BulkActionsPanelConfig, RowSelection } from '../types';
import { LastUpdatedAt } from '../components/last_updated_at';
import { AlertsQueryInspector } from '../components/alerts_query_inspector';
import { ALERTS_TABLE_TITLE } from '../translations';

const BulkActionsToolbar = lazy(() => import('../components/bulk_actions_toolbar_control'));

const RightControl = memo(
  ({
    additionalToolbarControls,
    alertsQuerySnapshot,
    showInspectButton,
  }: {
    additionalToolbarControls?: ReactNode;
    alertsQuerySnapshot?: EsQuerySnapshot;
    showInspectButton: boolean;
  }) => {
    const {
      bulkActionsStore: [bulkActionsState],
    } = useAlertsTableContext();
    return (
      <>
        {showInspectButton && alertsQuerySnapshot && (
          <AlertsQueryInspector
            inspectTitle={ALERTS_TABLE_TITLE}
            alertsQuerySnapshot={alertsQuerySnapshot}
          />
        )}
        <LastUpdatedAt updatedAt={bulkActionsState.updatedAt} />
        {additionalToolbarControls}
      </>
    );
  }
);

const Divider = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      role="separator"
      css={css`
        align-self: center;
        height: ${euiTheme.size.m};
        border-right: ${euiTheme.border.thin};
      `}
    />
  );
};

const LeftAppendControl = memo(
  ({
    alertsCount,
    hasBrowserFields,
    columnIds,
    browserFields,
    onResetColumns,
    onToggleColumn,
    fieldsBrowserOptions,
  }: {
    alertsCount: number;
    columnIds: string[];
    onToggleColumn: (columnId: string) => void;
    onResetColumns: () => void;
    controls?: EuiDataGridToolBarAdditionalControlsOptions;
    fieldsBrowserOptions?: FieldBrowserOptions;
    hasBrowserFields: boolean;
    browserFields: BrowserFields;
  }) => {
    return (
      <>
        <AlertsCount count={alertsCount} />
        {hasBrowserFields && (
          <>
            <Divider />
            <FieldBrowser
              columnIds={columnIds}
              browserFields={browserFields}
              onResetColumns={onResetColumns}
              onToggleColumn={onToggleColumn}
              options={fieldsBrowserOptions}
            />
          </>
        )}
      </>
    );
  }
);

const useGetDefaultVisibility = ({
  alertsCount,
  columnIds,
  onToggleColumn,
  onResetColumns,
  browserFields,
  additionalToolbarControls,
  fieldsBrowserOptions,
  alertsQuerySnapshot,
  showInspectButton,
  toolbarVisibilityProp,
}: {
  alertsCount: number;
  columnIds: string[];
  onToggleColumn: (columnId: string) => void;
  onResetColumns: () => void;
  browserFields: BrowserFields;
  additionalToolbarControls?: ReactNode;
  fieldsBrowserOptions?: FieldBrowserOptions;
  alertsQuerySnapshot?: EsQuerySnapshot;
  showInspectButton: boolean;
  toolbarVisibilityProp?: EuiDataGridToolBarVisibilityOptions;
}): EuiDataGridToolBarVisibilityOptions => {
  return useMemo(() => {
    const hasBrowserFields = Object.keys(browserFields).length > 0;
    return {
      additionalControls: {
        right: (
          <RightControl
            additionalToolbarControls={additionalToolbarControls}
            alertsQuerySnapshot={alertsQuerySnapshot}
            showInspectButton={showInspectButton}
          />
        ),
        left: {
          append: (
            <LeftAppendControl
              alertsCount={alertsCount}
              hasBrowserFields={hasBrowserFields}
              columnIds={columnIds}
              browserFields={browserFields}
              onResetColumns={onResetColumns}
              onToggleColumn={onToggleColumn}
              fieldsBrowserOptions={fieldsBrowserOptions}
            />
          ),
        },
      },
      showColumnSelector: {
        allowHide: true,
      },
      showSortSelector: true,
    };
  }, [
    alertsCount,
    browserFields,
    columnIds,
    fieldsBrowserOptions,
    alertsQuerySnapshot,
    onResetColumns,
    onToggleColumn,
    showInspectButton,
    additionalToolbarControls,
  ]);
};

export const useGetToolbarVisibility = ({
  bulkActions,
  alertsCount,
  rowSelection,
  alerts,
  isLoading,
  columnIds,
  onToggleColumn,
  onResetColumns,
  browserFields,
  setIsBulkActionsLoading,
  clearSelection,
  additionalToolbarControls,
  refresh,
  fieldsBrowserOptions,
  alertsQuerySnapshot,
  showInspectButton,
  toolbarVisibilityProp,
  settings,
}: {
  bulkActions: BulkActionsPanelConfig[];
  alertsCount: number;
  rowSelection: RowSelection;
  alerts: Alert[];
  isLoading: boolean;
  columnIds: string[];
  onToggleColumn: (columnId: string) => void;
  onResetColumns: () => void;
  browserFields: any;
  setIsBulkActionsLoading: (isLoading: boolean) => void;
  clearSelection: () => void;
  additionalToolbarControls?: ReactNode;
  refresh: () => void;
  fieldsBrowserOptions?: FieldBrowserOptions;
  alertsQuerySnapshot?: EsQuerySnapshot;
  showInspectButton: boolean;
  toolbarVisibilityProp?: EuiDataGridToolBarVisibilityOptions;
  settings: SettingsStart;
}): EuiDataGridToolBarVisibilityOptions => {
  const selectedRowsCount = rowSelection.size;
  const defaultVisibilityProps = useMemo(() => {
    return {
      alertsCount,
      columnIds,
      onToggleColumn,
      onResetColumns,
      browserFields,
      additionalToolbarControls,
      fieldsBrowserOptions,
      alertsQuerySnapshot,
      showInspectButton,
    };
  }, [
    alertsCount,
    columnIds,
    onToggleColumn,
    onResetColumns,
    browserFields,
    additionalToolbarControls,
    fieldsBrowserOptions,
    alertsQuerySnapshot,
    showInspectButton,
  ]);
  const defaultVisibility = useGetDefaultVisibility(defaultVisibilityProps);
  const options = useMemo(() => {
    const isBulkActionsActive =
      selectedRowsCount === 0 || selectedRowsCount === undefined || bulkActions.length === 0;

    if (isBulkActionsActive) {
      return {
        ...defaultVisibility,
        ...(toolbarVisibilityProp ?? {}),
      };
    } else {
      return {
        showColumnSelector: false,
        showSortSelector: false,
        additionalControls: {
          right: (
            <RightControl
              additionalToolbarControls={additionalToolbarControls}
              alertsQuerySnapshot={alertsQuerySnapshot}
              showInspectButton={showInspectButton}
            />
          ),
          left: {
            append: (
              <>
                <AlertsCount count={alertsCount} />
                <Suspense fallback={null}>
                  <Divider />
                  <BulkActionsToolbar
                    totalItems={alertsCount}
                    panels={bulkActions}
                    alerts={alerts}
                    setIsBulkActionsLoading={setIsBulkActionsLoading}
                    clearSelection={clearSelection}
                    refresh={refresh}
                    settings={settings}
                  />
                </Suspense>
              </>
            ),
          },
        },
        ...(toolbarVisibilityProp ?? {}),
      };
    }
  }, [
    selectedRowsCount,
    bulkActions,
    defaultVisibility,
    toolbarVisibilityProp,
    additionalToolbarControls,
    alertsQuerySnapshot,
    showInspectButton,
    alertsCount,
    alerts,
    setIsBulkActionsLoading,
    clearSelection,
    refresh,
    settings,
  ]);

  return options;
};
