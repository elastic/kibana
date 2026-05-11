/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { useLocation } from 'react-router-dom';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormControlButton,
  EuiFormControlLayout,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SavedObjectFinder } from '@kbn/saved-objects-finder-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { FinderAttributes, SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';

import { useMlKibana, useNavigateToPath } from '../../contexts/kibana';

type SavedObject = SavedObjectCommon<FinderAttributes & { isTextBasedQuery?: boolean }>;

const pickerPanelCss = css({ width: 600, maxHeight: '70vh', overflow: 'auto' });

export interface DataSourcePickerProps {
  currentDataView: DataView | null;
  currentSavedSearch: SavedSearch | null;
  /**
   * Called when the user clicks "Create a data view". When omitted, the standard
   * data view editor flyout is opened and the page navigates to the newly created view.
   */
  onCreateDataView?: () => void;
  /** data-test-subj for the "Create a data view" button */
  createDataViewButtonTestSubj?: string;
}

export const DataSourcePicker: FC<DataSourcePickerProps> = ({
  currentDataView,
  currentSavedSearch,
  onCreateDataView,
  createDataViewButtonTestSubj = 'mlDataSourcePickerCreateDataViewButton',
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const navigateToPath = useNavigateToPath();
  const location = useLocation();
  const { contentManagement, uiSettings, dataViewEditor } = useMlKibana().services;
  const closeDataViewEditorRef = useRef<() => void | undefined>();

  const canEditDataView = Boolean(dataViewEditor?.userPermissions.editDataView());

  const onChoose = (id: string, type: string) => {
    setIsPopoverOpen(false);
    const param = type === 'index-pattern' ? 'index' : 'savedSearchId';
    navigateToPath(`${location.pathname}?${param}=${encodeURIComponent(id)}`);
  };

  const openCreateDataViewFlyout = useCallback(() => {
    setIsPopoverOpen(false);
    closeDataViewEditorRef.current = dataViewEditor?.openEditor({
      onSave: (dataView) => {
        if (dataView.id) {
          navigateToPath(`${location.pathname}?index=${encodeURIComponent(dataView.id)}`);
        }
      },
    });
  }, [dataViewEditor, navigateToPath, location.pathname]);

  useEffect(function cleanUpFlyout() {
    return () => {
      if (closeDataViewEditorRef.current) {
        closeDataViewEditorRef.current();
      }
    };
  }, []);

  const handleCreateDataView = useCallback(() => {
    setIsPopoverOpen(false);
    if (onCreateDataView) {
      onCreateDataView();
    } else {
      openCreateDataViewFlyout();
    }
  }, [onCreateDataView, openCreateDataViewFlyout]);

  const triggerLabel = currentSavedSearch?.title
    ? currentSavedSearch.title
    : currentDataView?.getName() ?? '';

  const prepend = currentSavedSearch?.title
    ? i18n.translate('xpack.ml.dataSourcePicker.discoverSessionLabel', {
        defaultMessage: 'Discover session',
      })
    : currentDataView
    ? i18n.translate('xpack.ml.dataSourcePicker.dataViewLabel', {
        defaultMessage: 'Data view',
      })
    : undefined;

  const triggerButton = (
    <EuiFormControlButton
      compressed
      aria-expanded={isPopoverOpen}
      data-test-subj="mlDataSourceSelectorButton"
      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
    >
      <EuiFlexGroup
        component="span"
        alignItems="center"
        gutterSize="s"
        responsive={false}
        css={{ maxWidth: '100%' }}
      >
        <span className="eui-textTruncate" data-test-subj="mlDataSourceSelectorTitle">
          {triggerLabel ||
            i18n.translate('xpack.ml.dataSourcePicker.placeholderLabel', {
              defaultMessage: 'Select data source',
            })}
        </span>
      </EuiFlexGroup>
    </EuiFormControlButton>
  );

  const popover = (
    <EuiPopover
      ownFocus
      button={triggerButton}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
      panelProps={{ css: pickerPanelCss }}
      aria-label={i18n.translate('xpack.ml.dataSourcePicker.popoverAriaLabel', {
        defaultMessage: 'Data source selector',
      })}
    >
      <SavedObjectFinder
        id="mlDataSourcePicker"
        key="mlDataSourcePickerFinder"
        onChoose={onChoose}
        showFilter
        noItemsMessage={i18n.translate('xpack.ml.dataSourcePicker.notFoundLabel', {
          defaultMessage: 'No matching data views or saved Discover sessions found.',
        })}
        savedObjectMetaData={[
          {
            type: 'search',
            getIconForSavedObject: () => 'discoverApp',
            name: i18n.translate('xpack.ml.dataSourcePicker.savedObjectType.discoverSession', {
              defaultMessage: 'Discover session',
            }),
            showSavedObject: (savedObject: SavedObject) =>
              savedObject.attributes.isTextBasedQuery !== true,
          },
          {
            type: 'index-pattern',
            getIconForSavedObject: () => 'indexPatternApp',
            name: i18n.translate('xpack.ml.dataSourcePicker.savedObjectType.dataView', {
              defaultMessage: 'Data view',
            }),
          },
        ]}
        fixedPageSize={20}
        services={{
          contentClient: contentManagement.client,
          uiSettings,
        }}
      >
        <EuiButton
          size="m"
          fill
          iconType="plusCircle"
          onClick={handleCreateDataView}
          disabled={!canEditDataView}
          data-test-subj={createDataViewButtonTestSubj}
        >
          <FormattedMessage
            id="xpack.ml.dataSourcePicker.createDataViewButton"
            defaultMessage="Create a data view"
          />
        </EuiButton>
      </SavedObjectFinder>
    </EuiPopover>
  );

  if (prepend) {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
          <EuiFormControlLayout compressed isDropdown prepend={prepend}>
            {popover}
          </EuiFormControlLayout>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return popover;
};
