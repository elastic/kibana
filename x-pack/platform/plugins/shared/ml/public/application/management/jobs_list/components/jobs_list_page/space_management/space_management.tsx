/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SearchFilterConfig, EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiSpacer,
  EuiTabbedContent,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiProgress,
} from '@elastic/eui';

import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { useTableState } from '@kbn/ml-in-memory-table';
import { useEnabledFeatures } from '../../../../../contexts/ml';
import type { JobType, MlSavedObjectType } from '../../../../../../../common/types/saved_objects';
import type {
  ManagementListResponse,
  ManagementItems,
} from '../../../../../../../common/types/management';
import { useManagementApiService } from '../../../../../services/ml_api_service/management';
import { getColumns } from './columns';
import { MLSavedObjectsSpacesList } from '../../../../../components/ml_saved_objects_spaces_list';
import { getFilters } from './filters';
import { useMlKibana } from '../../../../../contexts/kibana/kibana_context';

interface Props {
  spacesApi?: SpacesPluginStart;
  onTabChange: (tabId: MlSavedObjectType) => void;
  onReload: React.Dispatch<React.SetStateAction<(() => void) | null>>;
}

export const SpaceManagement: FC<Props> = ({ spacesApi, onTabChange, onReload }) => {
  const {
    services: { application },
  } = useMlKibana();
  const { getList } = useManagementApiService();

  const [currentTabId, setCurrentTabId] = useState<MlSavedObjectType | null>(null);
  const [items, setItems] = useState<ManagementListResponse>();
  const [columns, setColumns] = useState<Array<EuiBasicTableColumn<ManagementItems>>>([]);
  const [filters, setFilters] = useState<SearchFilterConfig[] | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const { isADEnabled, isDFAEnabled, isNLPEnabled } = useEnabledFeatures();

  const { onTableChange, pagination, sorting, setPageIndex } = useTableState<ManagementItems>(
    items ?? [],
    'id'
  );

  const isMounted = useRef(true);
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(
    function setInitialSelectedTab() {
      if (isADEnabled === true) {
        setCurrentTabId('anomaly-detector');
      } else if (isDFAEnabled === true) {
        setCurrentTabId('data-frame-analytics');
      } else if (isNLPEnabled === true) {
        setCurrentTabId('trained-model');
      }
    },
    [isADEnabled, isDFAEnabled, isNLPEnabled]
  );

  const loadingTab = useRef<MlSavedObjectType | null>(null);
  const refresh = useCallback(
    (tabId: MlSavedObjectType | null) => {
      if (tabId === null) {
        return;
      }

      loadingTab.current = tabId;
      setIsLoading(true);
      getList(tabId)
        .then((jobList) => {
          if (isMounted.current && tabId === loadingTab.current) {
            setItems(jobList);
            setIsLoading(false);
            setFilters(getFilters(tabId, jobList));
          }
        })
        .catch(() => {
          if (isMounted.current) {
            setItems([]);
            setFilters(undefined);
            setIsLoading(false);
          }
        });
    },
    [getList, loadingTab]
  );

  useEffect(() => {
    onReload(() => () => refresh(currentTabId));
    return () => {
      onReload(null);
    };
  }, [currentTabId, refresh, onReload]);

  useEffect(
    function refreshOnTabChange() {
      setItems(undefined);
      if (currentTabId !== null) {
        setColumns(createColumns());
        onTabChange(currentTabId);
        refresh(currentTabId);
        setPageIndex(0);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentTabId]
  );

  const canShareIntoSpace = useMemo(() => {
    return !application?.capabilities?.savedObjectsManagement?.shareIntoSpace;
  }, [application]);
  const createColumns = useCallback(() => {
    if (currentTabId === null) {
      return [];
    }
    return [
      ...getColumns(currentTabId),
      ...(spacesApi !== undefined
        ? [
            {
              name: i18n.translate('xpack.ml.management.spaceManagementTableColumn.spaces', {
                defaultMessage: 'spaces',
              }),
              'data-test-subj': 'mlSpaceManagementTableColumnSpaces',
              sortable: true,
              truncateText: true,
              align: 'right',
              width: '10%',
              render: (item: ManagementItems) => {
                return (
                  <MLSavedObjectsSpacesList
                    disabled={canShareIntoSpace}
                    spacesApi={spacesApi}
                    spaceIds={item.spaces}
                    mlSavedObjectType={currentTabId}
                    id={item.id}
                    refresh={refresh.bind(null, currentTabId)}
                  />
                );
              },
            },
          ]
        : []),
    ] as Array<EuiBasicTableColumn<ManagementItems>>;
  }, [currentTabId, spacesApi, refresh, canShareIntoSpace]);

  const getTable = useCallback(() => {
    return (
      <>
        {isLoading ? <EuiProgress size="xs" color="accent" /> : null}

        <EuiSpacer size="m" />
        {items === undefined ? null : (
          <>
            <EuiFlexGroup justifyContent={'flexEnd'} gutterSize={'none'}>
              <EuiFlexItem grow={false}>
                <RefreshButton
                  onRefreshClick={refresh.bind(null, currentTabId)}
                  isRefreshing={isLoading}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiInMemoryTable<ManagementItems>
              data-test-subj={`mlSpacesManagementTable-${currentTabId} ${
                isLoading ? 'loading' : 'loaded'
              }`}
              items={items}
              columns={columns}
              search={{
                box: {
                  incremental: true,
                },
                filters,
              }}
              onTableChange={onTableChange}
              pagination={pagination}
              sorting={sorting}
              rowProps={(item) => ({
                'data-test-subj': `mlSpacesManagementTable-${currentTabId} row-${item.id}`,
              })}
            />
          </>
        )}
      </>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, columns, isLoading, filters, currentTabId, refresh, onTableChange]);

  const tabs = useMemo(() => {
    const tempTabs = [];

    if (isADEnabled === true) {
      tempTabs.push({
        'data-test-subj': 'mlStackManagementAnomalyDetectionTab',
        id: 'anomaly-detector',
        name: i18n.translate('xpack.ml.management.list.anomalyDetectionTab', {
          defaultMessage: 'Anomaly detection',
        }),
        content: getTable(),
      });
    }
    if (isDFAEnabled === true) {
      tempTabs.push({
        'data-test-subj': 'mlStackManagementAnalyticsTab',
        id: 'data-frame-analytics',
        name: i18n.translate('xpack.ml.management.list.analyticsTab', {
          defaultMessage: 'Analytics',
        }),
        content: getTable(),
      });
    }
    if (isNLPEnabled === true || isDFAEnabled === true) {
      tempTabs.push({
        'data-test-subj': 'mlStackManagementTrainedModelsTab',
        id: 'trained-model',
        name: i18n.translate('xpack.ml.management.list.trainedModelsTab', {
          defaultMessage: 'Trained models',
        }),
        content: getTable(),
      });
    }
    return tempTabs;
  }, [getTable, isADEnabled, isDFAEnabled, isNLPEnabled]);

  return (
    <EuiTabbedContent
      data-test-subj="mlSpacesManagementTable"
      onTabClick={({ id }: { id: string }) => {
        setCurrentTabId(id as JobType);
      }}
      size="s"
      tabs={tabs}
      initialSelectedTab={tabs[0]}
    />
  );
};

export const RefreshButton: FC<{ onRefreshClick: () => void; isRefreshing: boolean }> = ({
  onRefreshClick,
  isRefreshing,
}) => (
  <EuiButtonEmpty
    data-test-subj={`mlRefreshJobListButton${isRefreshing ? ' loading' : ' loaded'}`}
    onClick={onRefreshClick}
    isLoading={isRefreshing}
    iconType={'refresh'}
    iconSide={'left'}
    iconSize={'m'}
  >
    <FormattedMessage id="xpack.ml.management.list.refreshButtonLabel" defaultMessage="Refresh" />
  </EuiButtonEmpty>
);
