/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType, FC } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { parse, stringify } from 'query-string';
import { css } from '@emotion/react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  DataView,
  DataViewListItem,
  DataViewsPublicPluginStart,
} from '@kbn/data-views-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { DataViewFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import type { DataViewPickerProps } from '@kbn/unified-search-plugin/public';

import type {
  MlOpenSessionFlyoutProps,
  MlOpenSessionFlyoutServices,
} from './ml_open_session_flyout';
import { MlOpenSessionFlyout } from './ml_open_session_flyout';

export type { DataViewPickerProps };

export interface MlDataSourcePickerServices extends MlOpenSessionFlyoutServices {
  dataViews: DataViewsPublicPluginStart;
  dataViewEditor?: DataViewEditorStart;
  dataViewFieldEditor: DataViewFieldEditorStart;
}

export interface MlDataSourcePickerProps {
  currentDataView: DataView | null;
  services: MlDataSourcePickerServices;
  DataViewPickerComponent: ComponentType<DataViewPickerProps>;
  SavedObjectFinderComponent: MlOpenSessionFlyoutProps['SavedObjectFinderComponent'];
  /** Called after a field is saved via the field editor */
  onFieldSaved?: () => void;
}

const dataViewPickerStyles = css({ minWidth: 180 });

export const MlDataSourcePicker: FC<MlDataSourcePickerProps> = ({
  currentDataView,
  services,
  DataViewPickerComponent,
  SavedObjectFinderComponent,
  onFieldSaved,
}) => {
  const [savedDataViews, setSavedDataViews] = useState<DataViewListItem[]>([]);
  const [isOpenSessionPanelVisible, setOpenSessionPanelVisible] = useState(false);
  const history = useHistory();
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

  const updateDataSource = useCallback(
    (param: 'index' | 'savedSearchId', value: string) => {
      const { index: _i, savedSearchId: _s, ...rest } = parse(location.search, { sort: false });
      history.replace({ search: '?' + stringify({ ...rest, [param]: value }) });
    },
    [history, location.search]
  );

  const onChangeDataView = useCallback(
    (id: string) => {
      updateDataSource('index', id);
    },
    [updateDataSource]
  );

  const onDataViewCreated = useCallback(
    (created: DataView) => {
      if (created.id) {
        dataViews.getIdsWithTitle().then(setSavedDataViews);
        updateDataSource('index', created.id);
      }
    },
    [dataViews, updateDataSource]
  );

  const onOpenSavedSearch = useCallback(
    (id: string) => {
      setOpenSessionPanelVisible(false);
      updateDataSource('savedSearchId', id);
    },
    [updateDataSource]
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
                onFieldSaved?.();
              },
            });
          }
        : undefined,
    [canEditDataView, currentDataView, dataViewFieldEditor, dataViews, onFieldSaved]
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
      <EuiFlexItem grow={false} css={dataViewPickerStyles}>
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
      />
    </>
  ) : (
    dataViewPickerContent
  );
};
