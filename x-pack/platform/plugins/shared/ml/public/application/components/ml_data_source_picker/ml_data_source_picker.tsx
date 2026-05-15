/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataView, DataViewListItem } from '@kbn/data-views-plugin/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { DataViewPicker } from '@kbn/unified-search-plugin/public';

import { useMlKibana, useNavigateToPath } from '../../contexts/kibana';

export interface MlDataSourcePickerProps {
  currentDataView: DataView | null;
  currentSavedSearch: SavedSearch | null;
}

export const MlDataSourcePicker: FC<MlDataSourcePickerProps> = ({ currentDataView }) => {
  const [savedDataViews, setSavedDataViews] = useState<DataViewListItem[]>([]);
  const [isOpenSessionPanelVisible, setOpenSessionPanelVisible] = useState(false);
  const navigateToPath = useNavigateToPath();
  const location = useLocation();
  const { dataViews, dataViewEditor, dataViewFieldEditor, discover } = useMlKibana().services;
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

  const canEditDataView = Boolean(dataViewEditor?.userPermissions.editDataView());

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

  const triggerLabel =
    currentDataView?.getName() ??
    i18n.translate('xpack.ml.mlDataSourcePicker.selectDataViewLabel', {
      defaultMessage: 'Select data view',
    });

  const { OpenSessionPanel } = discover;

  return (
    <>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <DataViewPicker
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
            content={i18n.translate('xpack.ml.mlDataSourcePicker.openButton.tooltip', {
              defaultMessage: 'Open Discover session',
            })}
          >
            <EuiButtonIcon
              display="base"
              size="m"
              iconType="folderOpen"
              color="text"
              onClick={() => setOpenSessionPanelVisible(true)}
              data-test-subj="mlOpenDiscoverSessionButton"
              aria-label={i18n.translate('xpack.ml.mlDataSourcePicker.openButton.ariaLabel', {
                defaultMessage: 'Open Discover session',
              })}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
      {isOpenSessionPanelVisible ? (
        <OpenSessionPanel
          onClose={() => setOpenSessionPanelVisible(false)}
          onOpenSavedSearch={onOpenSavedSearch}
        />
      ) : null}
    </>
  );
};
