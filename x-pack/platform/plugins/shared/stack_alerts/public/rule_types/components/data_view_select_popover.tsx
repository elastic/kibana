/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiExpression,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiText,
  EuiToolTip,
  useEuiPaddingCSS,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type {
  DataView,
  DataViewListItem,
  DataViewSpec,
  DataViewsPublicPluginStart,
} from '@kbn/data-views-plugin/public';
import type { ToastsStart } from '@kbn/core/public';
import { DataViewSelector } from '@kbn/unified-search-plugin/public';
import type { DataViewListItemEnhanced } from '@kbn/unified-search-plugin/public/dataview_picker/dataview_list';
import type { EsQueryRuleMetaData } from '../es_query/types';

const DESKTOP_WIDTH = 450;
const MOBILE_WIDTH = 350;

export interface DataViewSelectPopoverProps {
  dependencies: {
    dataViews: DataViewsPublicPluginStart;
    dataViewEditor: DataViewEditorStart;
    toasts: ToastsStart;
  };
  dataView?: DataView;
  metadata?: EsQueryRuleMetaData;
  onSelectDataView: (selectedDataView: DataView) => void;
  onChangeMetaData: (metadata: EsQueryRuleMetaData) => void;
}

const toDataViewListItem = (dataView: DataView): DataViewListItemEnhanced => {
  return {
    id: dataView.id!,
    title: dataView.title,
    name: dataView.name,
    type: dataView.type,
    isAdhoc: !dataView.isPersisted(),
  };
};

const toPersistedDataViewListItem = (dataView: DataViewListItem): DataViewListItemEnhanced => ({
  ...dataView,
  isAdhoc: false,
});

export const DataViewSelectPopover: React.FunctionComponent<DataViewSelectPopoverProps> = ({
  dependencies: { dataViews, dataViewEditor, toasts },
  metadata,
  dataView,
  onSelectDataView,
  onChangeMetaData,
}) => {
  const [loadingDataViews, setLoadingDataViews] = useState(false);
  const [dataViewItems, setDataViewsItems] = useState<DataViewListItemEnhanced[]>([]);
  const [dataViewPopoverOpen, setDataViewPopoverOpen] = useState(false);

  const isMobile = useIsWithinBreakpoints(['xs']);

  const closeDataViewEditor = useRef<() => void | undefined>();

  const computedMetadata = useMemo(() => {
    return {
      ...metadata,
      adHocDataViewList: metadata?.adHocDataViewList ?? [],
      isManagementPage: metadata?.isManagementPage ?? true,
    };
  }, [metadata]);

  const allDataViewItems = useMemo(
    () => [
      ...(dataViewItems ?? []),
      ...(computedMetadata.adHocDataViewList || []).map(toDataViewListItem),
    ],
    [dataViewItems, computedMetadata.adHocDataViewList]
  );

  const closeDataViewPopover = useCallback(() => setDataViewPopoverOpen(false), []);

  const onChangeDataView = useCallback(
    async (selectedDataViewId: string) => {
      try {
        // Suppress the data views service toast so we can show a specific message
        // for the data view the user actually selected.
        const selectedDataView = await dataViews.get(selectedDataViewId, false);
        onSelectDataView(selectedDataView);
        closeDataViewPopover();
      } catch (error) {
        const listItem = allDataViewItems.find((item) => item.id === selectedDataViewId);
        const dataViewName = listItem?.name || listItem?.title || selectedDataViewId;
        toasts.addDanger({
          title: i18n.translate(
            'xpack.stackAlerts.components.ui.dataViewSelectPopover.loadDataViewErrorTitle',
            {
              defaultMessage: "Data view ''{dataViewName}'' could not be loaded",
              values: { dataViewName },
            }
          ),
          text: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [allDataViewItems, closeDataViewPopover, dataViews, onSelectDataView, toasts]
  );

  const loadPersistedDataViews = useCallback(async () => {
    setLoadingDataViews(true);
    try {
      // Use getIdsWithTitle so the picker list does not hydrate fields for every
      // data view in the space. refresh=true avoids stale saved object cache data.
      const dataViewsList = await dataViews.getIdsWithTitle(true);
      setDataViewsItems(dataViewsList.map(toPersistedDataViewListItem));
    } catch (e) {
      // Error fetching data views
    }
    setLoadingDataViews(false);
  }, [dataViews]);

  const onAddAdHocDataView = useCallback(
    (adHocDataView: DataView) => {
      onChangeMetaData({
        ...computedMetadata,
        adHocDataViewList: [...(computedMetadata.adHocDataViewList || []), adHocDataView],
      });
    },
    [computedMetadata, onChangeMetaData]
  );

  const createDataView = useMemo(
    () =>
      dataViewEditor.userPermissions.editDataView()
        ? () => {
            closeDataViewEditor.current = dataViewEditor.openEditor({
              onSave: async (createdDataView) => {
                if (createdDataView.id) {
                  if (!createdDataView.isPersisted()) {
                    onAddAdHocDataView(createdDataView);
                  }

                  await loadPersistedDataViews();
                  await onChangeDataView(createdDataView.id);
                }
              },
              allowAdHocDataView: true,
            });
          }
        : undefined,
    [dataViewEditor, loadPersistedDataViews, onChangeDataView, onAddAdHocDataView]
  );

  useEffect(() => {
    return () => {
      // Make sure to close the editor when unmounting
      if (closeDataViewEditor.current) {
        closeDataViewEditor.current();
      }
    };
  }, []);

  useEffect(() => {
    loadPersistedDataViews();
  }, [loadPersistedDataViews]);

  const createDataViewButtonPadding = useEuiPaddingCSS('left');

  const onCreateDefaultAdHocDataView = useCallback(
    async (dataViewSpec: DataViewSpec) => {
      const newDataView = await dataViews.create(dataViewSpec);
      if (newDataView.fields.getByName('@timestamp')?.type === 'date') {
        newDataView.timeFieldName = '@timestamp';
      }

      onAddAdHocDataView(newDataView);
      onChangeDataView(newDataView.id!);
    },
    [dataViews, onAddAdHocDataView, onChangeDataView]
  );

  if (loadingDataViews) {
    // The loading indicator is to make sure we don't render an
    // empty popover when the DV cache is initially loading
    return <EuiLoadingSpinner />;
  }

  return (
    <EuiPopover
      id="dataViewPopover"
      aria-label={i18n.translate(
        'xpack.stackAlerts.components.ui.dataViewSelectPopover.ariaLabel',
        { defaultMessage: 'Data view' }
      )}
      button={
        <EuiExpression
          display="columns"
          data-test-subj="selectDataViewExpression"
          description={i18n.translate('xpack.stackAlerts.components.ui.alertParams.dataViewLabel', {
            defaultMessage: 'data view',
          })}
          value={
            dataView?.getName() ??
            i18n.translate('xpack.stackAlerts.components.ui.alertParams.dataViewPlaceholder', {
              defaultMessage: 'Select a data view',
            })
          }
          isActive={dataViewPopoverOpen}
          onClick={() => {
            setDataViewPopoverOpen(true);
          }}
          isInvalid={!dataView?.id}
        />
      }
      isOpen={dataViewPopoverOpen}
      closePopover={closeDataViewPopover}
      ownFocus
      anchorPosition="downLeft"
      display="block"
    >
      <div
        css={css`
          width: ${isMobile ? `${MOBILE_WIDTH}px` : `${DESKTOP_WIDTH}px`};
        `}
        data-test-subj="chooseDataViewPopoverContent"
      >
        <EuiPopoverTitle>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem>
              {i18n.translate('xpack.stackAlerts.components.ui.alertParams.dataViewPopoverTitle', {
                defaultMessage: 'Data view',
              })}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={i18n.translate(
                  'xpack.stackAlerts.components.ui.alertParams.closeDataViewPopoverLabel',
                  { defaultMessage: 'Close' }
                )}
                disableScreenReaderOutput
              >
                <EuiButtonIcon
                  data-test-subj="closeDataViewPopover"
                  iconType="cross"
                  color="danger"
                  aria-label={i18n.translate(
                    'xpack.stackAlerts.components.ui.alertParams.closeDataViewPopoverLabel',
                    { defaultMessage: 'Close' }
                  )}
                  onClick={closeDataViewPopover}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPopoverTitle>
        <DataViewSelector
          currentDataViewId={dataView?.id}
          dataViewsList={allDataViewItems}
          setPopoverIsOpen={setDataViewPopoverOpen}
          onChangeDataView={onChangeDataView}
          onCreateDefaultAdHocDataView={onCreateDefaultAdHocDataView}
        />
        {createDataView ? (
          <EuiPopoverFooter paddingSize="none">
            <EuiButtonEmpty
              css={createDataViewButtonPadding.s}
              iconType="plusCircle"
              data-test-subj="chooseDataViewPopover.createDataViewButton"
              onClick={() => {
                closeDataViewPopover();
                createDataView();
              }}
            >
              {i18n.translate(
                'xpack.stackAlerts.components.ui.alertParams.dataViewPopover.createDataViewButton',
                {
                  defaultMessage: 'Create a data view',
                }
              )}
            </EuiButtonEmpty>
          </EuiPopoverFooter>
        ) : (
          <EuiPopoverFooter>
            <EuiText color="subdued" size="xs">
              <FormattedMessage
                id="xpack.stackAlerts.components.ui.alertParams.dataViewPopover.createDataViewButton.noPermissionDescription"
                defaultMessage="You need additional privileges to create data views. Contact your administrator."
              />
            </EuiText>
          </EuiPopoverFooter>
        )}
      </div>
    </EuiPopover>
  );
};
