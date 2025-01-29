/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiDataGridToolBarAdditionalControlsOptions,
  EuiDataGridToolBarVisibilityOptions,
} from '@elastic/eui';
import React, { lazy, Suspense, memo, useMemo, useContext } from 'react';
import { BrowserFields } from '@kbn/alerting-types';
import { EsQuerySnapshot } from '@kbn/alerts-ui-shared';
import { AlertsCount } from './components/alerts_count/alerts_count';
import { AlertsTableContext } from '../contexts/alerts_table_context';
import type { Alerts, BulkActionsPanelConfig, RowSelection } from '../../../../types';
import { LastUpdatedAt } from './components/last_updated_at';
import { FieldBrowser } from '../../field_browser';
import { FieldBrowserOptions } from '../../field_browser/types';
import { InspectButton } from './components/inspect';
import { ALERTS_TABLE_TITLE } from '../translations';

const BulkActionsToolbar = lazy(() => import('../bulk_actions/components/toolbar'));

const RightControl = memo(
  ({
    controls,
    querySnapshot,
    showInspectButton,
  }: {
    controls?: EuiDataGridToolBarAdditionalControlsOptions;
    querySnapshot: EsQuerySnapshot;
    showInspectButton: boolean;
  }) => {
    const {
      bulkActions: [bulkActionsState],
    } = useContext(AlertsTableContext);
    return (
      <>
        {showInspectButton && (
          <InspectButton inspectTitle={ALERTS_TABLE_TITLE} querySnapshot={querySnapshot} />
        )}
        <LastUpdatedAt updatedAt={bulkActionsState.updatedAt} />
        {controls?.right}
      </>
    );
  }
);

const LeftAppendControl = memo(
  ({
    alertsCount,
    hasBrowserFields,
    columnIds,
    browserFields,
    onResetColumns,
    onToggleColumn,
    fieldBrowserOptions,
  }: {
    alertsCount: number;
    columnIds: string[];
    onToggleColumn: (columnId: string) => void;
    onResetColumns: () => void;
    controls?: EuiDataGridToolBarAdditionalControlsOptions;
    fieldBrowserOptions?: FieldBrowserOptions;
    hasBrowserFields: boolean;
    browserFields: BrowserFields;
  }) => {
    return (
      <>
        <AlertsCount count={alertsCount} />
        {hasBrowserFields && (
          <FieldBrowser
            columnIds={columnIds}
            browserFields={browserFields}
            onResetColumns={onResetColumns}
            onToggleColumn={onToggleColumn}
            options={fieldBrowserOptions}
          />
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
  controls,
  fieldBrowserOptions,
  querySnapshot,
  showInspectButton,
  toolbarVisibilityProp,
}: {
  alertsCount: number;
  columnIds: string[];
  onToggleColumn: (columnId: string) => void;
  onResetColumns: () => void;
  browserFields: BrowserFields;
  controls?: EuiDataGridToolBarAdditionalControlsOptions;
  fieldBrowserOptions?: FieldBrowserOptions;
  querySnapshot?: EsQuerySnapshot;
  showInspectButton: boolean;
  toolbarVisibilityProp?: EuiDataGridToolBarVisibilityOptions;
}): EuiDataGridToolBarVisibilityOptions => {
  const defaultVisibility = useMemo(() => {
    const hasBrowserFields = Object.keys(browserFields).length > 0;
    return {
      additionalControls: {
        right: querySnapshot && (
          <RightControl
            controls={controls}
            querySnapshot={querySnapshot}
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
              fieldBrowserOptions={fieldBrowserOptions}
            />
          ),
        },
      },
      showColumnSelector: {
        allowHide: false,
      },
      showSortSelector: true,
    };
  }, [
    alertsCount,
    browserFields,
    columnIds,
    fieldBrowserOptions,
    querySnapshot,
    onResetColumns,
    onToggleColumn,
    showInspectButton,
    controls,
  ]);
  return defaultVisibility;
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
  controls,
  refresh,
  fieldBrowserOptions,
  querySnapshot,
  showInspectButton,
  toolbarVisibilityProp,
}: {
  bulkActions: BulkActionsPanelConfig[];
  alertsCount: number;
  rowSelection: RowSelection;
  alerts: Alerts;
  isLoading: boolean;
  columnIds: string[];
  onToggleColumn: (columnId: string) => void;
  onResetColumns: () => void;
  browserFields: any;
  setIsBulkActionsLoading: (isLoading: boolean) => void;
  clearSelection: () => void;
  controls?: EuiDataGridToolBarAdditionalControlsOptions;
  refresh: () => void;
  fieldBrowserOptions?: FieldBrowserOptions;
  querySnapshot?: EsQuerySnapshot;
  showInspectButton: boolean;
  toolbarVisibilityProp?: EuiDataGridToolBarVisibilityOptions;
}): EuiDataGridToolBarVisibilityOptions => {
  const selectedRowsCount = rowSelection.size;
  const defaultVisibilityProps = useMemo(() => {
    return {
      alertsCount,
      columnIds,
      onToggleColumn,
      onResetColumns,
      browserFields,
      controls,
      fieldBrowserOptions,
      querySnapshot,
      showInspectButton,
    };
  }, [
    alertsCount,
    columnIds,
    onToggleColumn,
    onResetColumns,
    browserFields,
    controls,
    fieldBrowserOptions,
    querySnapshot,
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
          right: querySnapshot && (
            <RightControl
              controls={controls}
              querySnapshot={querySnapshot}
              showInspectButton={showInspectButton}
            />
          ),
          left: {
            append: (
              <>
                <AlertsCount count={alertsCount} />
                <Suspense fallback={null}>
                  <BulkActionsToolbar
                    totalItems={alertsCount}
                    panels={bulkActions}
                    alerts={alerts}
                    setIsBulkActionsLoading={setIsBulkActionsLoading}
                    clearSelection={clearSelection}
                    refresh={refresh}
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
    alertsCount,
    bulkActions,
    defaultVisibility,
    selectedRowsCount,
    toolbarVisibilityProp,
    alerts,
    clearSelection,
    refresh,
    setIsBulkActionsLoading,
    controls,
    querySnapshot,
    showInspectButton,
  ]);

  return options;
};
