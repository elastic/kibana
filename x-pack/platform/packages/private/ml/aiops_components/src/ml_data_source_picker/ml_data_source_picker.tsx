/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType, FC } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataView, DataViewListItem } from '@kbn/data-views-plugin/public';
import type { DataViewPickerProps } from '@kbn/unified-search-plugin/public';

import type {
  MlOpenSessionFlyoutProps,
  MlOpenSessionFlyoutServices,
} from './ml_open_session_flyout';
import { MlOpenSessionFlyout } from './ml_open_session_flyout';

export type { DataViewPickerProps };

export interface MlDataSourcePickerServices extends MlOpenSessionFlyoutServices {
  dataViews: {
    getIdsWithTitle(): Promise<DataViewListItem[]>;
  };
  dataViewEditor?: {
    userPermissions: {
      editDataView(): boolean;
    };
  };
  dataViewFieldEditor: {
    openEditor(options: { ctx: { dataView: DataView }; onSave?: () => void }): Promise<() => void>;
  };
}

export interface MlDataSourcePickerProps {
  currentDataView: DataView | null;
  services: MlDataSourcePickerServices;
  navigateToPath: (path: string) => void | Promise<void>;
  DataViewPickerComponent: ComponentType<DataViewPickerProps>;
  SavedObjectFinderComponent: MlOpenSessionFlyoutProps['SavedObjectFinderComponent'];
  /** When true, ES|QL-based sessions are hidden from the session picker */
  filterEsql?: boolean;
}

export const MlDataSourcePicker: FC<MlDataSourcePickerProps> = ({
  currentDataView,
  services,
  navigateToPath,
  DataViewPickerComponent,
  SavedObjectFinderComponent,
  filterEsql = false,
}) => {
  const [savedDataViews, setSavedDataViews] = useState<DataViewListItem[]>([]);
  const [isOpenSessionPanelVisible, setOpenSessionPanelVisible] = useState(false);
  const location = useLocation();
  const { dataViews, dataViewEditor, dataViewFieldEditor } = services;
  const closeFieldEditorRef = useRef<() => void | undefined>();

  useEffect(() => {
    return () => {
      closeFieldEditorRef.current?.();
    };
  }, []);

  useEffect(() => {
    dataViews.getIdsWithTitle().then(setSavedDataViews);
  }, [dataViews]);

  const onChangeDataView = useCallback(
    (id: string) => {
      navigateToPath(`${location.pathname}?index=${encodeURIComponent(id)}`);
    },
    [navigateToPath, location.pathname]
  );

  const onDataViewCreated = useCallback(
    (created: DataView) => {
      if (created.id) {
        dataViews.getIdsWithTitle().then(setSavedDataViews);
        navigateToPath(`${location.pathname}?index=${encodeURIComponent(created.id)}`);
      }
    },
    [dataViews, navigateToPath, location.pathname]
  );

  const onOpenSavedSearch = useCallback(
    (id: string) => {
      setOpenSessionPanelVisible(false);
      navigateToPath(`${location.pathname}?savedSearchId=${encodeURIComponent(id)}`);
    },
    [navigateToPath, location.pathname]
  );

  const canEditDataView = useMemo(
    () => Boolean(dataViewEditor?.userPermissions.editDataView()),
    [dataViewEditor]
  );

  const onAddField = useMemo(
    () =>
      canEditDataView && currentDataView
        ? async () => {
            closeFieldEditorRef.current = await dataViewFieldEditor.openEditor({
              ctx: { dataView: currentDataView },
              onSave: () => {
                dataViews.getIdsWithTitle().then(setSavedDataViews);
              },
            });
          }
        : undefined,
    [canEditDataView, currentDataView, dataViewFieldEditor, dataViews]
  );

  const triggerLabel = useMemo(
    () =>
      currentDataView?.getName() ??
      i18n.translate('xpack.aiops.mlDataSourcePicker.selectDataViewLabel', {
        defaultMessage: 'Select data view',
      }),
    [currentDataView]
  );

  const onOpenSession = useCallback(() => setOpenSessionPanelVisible(true), []);

  const onCloseSession = useCallback(() => setOpenSessionPanelVisible(false), []);

  const dataViewPickerContent = (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <DataViewPickerComponent
          currentDataViewId={currentDataView?.id}
          savedDataViews={savedDataViews}
          trigger={{
            label: triggerLabel,
            title: triggerLabel,
            'data-test-subj': 'mlDataSourceSelectorButton',
          }}
          onChangeDataView={onChangeDataView}
          onDataViewCreated={canEditDataView ? onDataViewCreated : undefined}
          onAddField={onAddField}
          compressed={false}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={i18n.translate('xpack.aiops.mlDataSourcePicker.openButton.tooltip', {
            defaultMessage: 'Open Discover session',
          })}
        >
          <EuiButtonIcon
            display="base"
            size="m"
            iconType="folderOpen"
            color="text"
            onClick={onOpenSession}
            data-test-subj="mlOpenDiscoverSessionButton"
            aria-label={i18n.translate('xpack.aiops.mlDataSourcePicker.openButton.ariaLabel', {
              defaultMessage: 'Open Discover session',
            })}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return isOpenSessionPanelVisible ? (
    <>
      {dataViewPickerContent}
      <MlOpenSessionFlyout
        services={services}
        onClose={onCloseSession}
        onOpenSavedSearch={onOpenSavedSearch}
        SavedObjectFinderComponent={SavedObjectFinderComponent}
        filterEsql={filterEsql}
      />
    </>
  ) : (
    dataViewPickerContent
  );
};
