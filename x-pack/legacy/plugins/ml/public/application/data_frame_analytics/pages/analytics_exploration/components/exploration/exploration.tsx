/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';

import { i18n } from '@kbn/i18n';

import {
  EuiCallOut,
  EuiDataGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTitle,
  Query,
} from '@elastic/eui';

import {
  useColorRange,
  ColorRangeLegend,
  COLOR_RANGE,
  COLOR_RANGE_SCALE,
} from '../../../../../components/color_range_legend';
import { ml } from '../../../../../services/ml_api_service';

import {
  euiDataGridStyle,
  euiDataGridToolbarSettings,
  sortColumns,
  DataFrameAnalyticsConfig,
  EsFieldName,
  INDEX_STATUS,
  SEARCH_SIZE,
  defaultSearchQuery,
} from '../../../../common';
import { isKeywordAndTextType } from '../../../../common/fields';

import { getOutlierScoreFieldName } from './common';
import { useExploreData, TableItem } from './use_explore_data';
import {
  DATA_FRAME_TASK_STATE,
  Query as QueryType,
} from '../../../analytics_management/components/analytics_list/common';
import { getTaskStateBadge } from '../../../analytics_management/components/analytics_list/columns';
import { SavedSearchQuery } from '../../../../../contexts/ml';
import { getIndexPatternIdFromName } from '../../../../../util/index_utils';
import { IIndexPattern } from '../../../../../../../../../../../src/plugins/data/common/index_patterns';
import { newJobCapsService } from '../../../../../services/new_job_capabilities_service';
import { useMlContext } from '../../../../../contexts/ml';

const FEATURE_INFLUENCE = 'feature_influence';

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

const ExplorationTitle: React.FC<{ jobId: string }> = ({ jobId }) => (
  <EuiTitle size="xs">
    <span>
      {i18n.translate('xpack.ml.dataframe.analytics.exploration.jobIdTitle', {
        defaultMessage: 'Outlier detection job ID {jobId}',
        values: { jobId },
      })}
    </span>
  </EuiTitle>
);

interface Props {
  jobId: string;
  jobStatus: DATA_FRAME_TASK_STATE;
}

const getFeatureCount = (jobConfig?: DataFrameAnalyticsConfig, tableItems: TableItem[] = []) => {
  if (jobConfig === undefined || tableItems.length === 0) {
    return 0;
  }

  return Object.keys(tableItems[0]).filter(key =>
    key.includes(`${jobConfig.dest.results_field}.${FEATURE_INFLUENCE}.`)
  ).length;
};

export const Exploration: FC<Props> = React.memo(({ jobId, jobStatus }) => {
  const [jobConfig, setJobConfig] = useState<DataFrameAnalyticsConfig | undefined>(undefined);

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });

  const [searchQuery, setSearchQuery] = useState<SavedSearchQuery>(defaultSearchQuery);
  const [searchError, setSearchError] = useState<any>(undefined);
  const [searchString, setSearchString] = useState<string | undefined>(undefined);

  const mlContext = useMlContext();

  const initializeJobCapsService = async () => {
    if (jobConfig !== undefined) {
      const sourceIndex = jobConfig.source.index[0];
      const indexPatternId = getIndexPatternIdFromName(sourceIndex) || sourceIndex;
      const indexPattern: IIndexPattern = await mlContext.indexPatterns.get(indexPatternId);
      if (indexPattern !== undefined) {
        await newJobCapsService.initializeFromIndexPattern(indexPattern, false, false);
      }
    }
  };

  useEffect(() => {
    (async function() {
      const analyticsConfigs = await ml.dataFrameAnalytics.getDataFrameAnalytics(jobId);
      if (
        Array.isArray(analyticsConfigs.data_frame_analytics) &&
        analyticsConfigs.data_frame_analytics.length > 0
      ) {
        setJobConfig(analyticsConfigs.data_frame_analytics[0]);
      }
    })();
  }, []);

  useEffect(() => {
    initializeJobCapsService();
  }, [jobConfig && jobConfig.id]);

  const [selectedFields, setSelectedFields] = useState([] as EsFieldName[]);

  const {
    errorMessage,
    loadExploreData,
    rowCount,
    sortField,
    sortDirection,
    status,
    tableFields,
    tableItems,
  } = useExploreData(jobConfig, selectedFields, setSelectedFields);

  const columns = [];

  const cellBgColor = useColorRange(
    COLOR_RANGE.BLUE,
    COLOR_RANGE_SCALE.INFLUENCER,
    getFeatureCount(jobConfig, tableItems)
  );

  if (jobConfig !== undefined && selectedFields.length > 0 && tableItems.length > 0) {
    columns.push(
      ...tableFields.sort(sortColumns(tableItems[0], jobConfig.dest.results_field)).map(id => {
        let columnType;
        let schema;

        if (tableItems.length > 0) {
          columnType = typeof tableItems[0][id];
        }

        switch (columnType) {
          case 'Date':
            schema = 'datetime';
            break;
          case 'number':
            schema = 'numeric';
            break;
        }

        return {
          id,
          isExpandable: columnType !== 'boolean',
          ...(schema !== undefined ? { columnType: schema } : {}),
        };
      })
    );
  }
  const renderCellValue = useMemo(() => {
    return ({
      rowIndex,
      columnId,
      setCellProps,
    }: {
      rowIndex: number;
      columnId: string;
      setCellProps: any;
    }) => {
      if (jobConfig === undefined) {
        return;
      }

      const adjustedRowIndex = rowIndex - pagination.pageIndex * pagination.pageSize;

      const fullItem = tableItems[adjustedRowIndex];

      const cellValue = tableItems.hasOwnProperty(adjustedRowIndex)
        ? tableItems[adjustedRowIndex][columnId]
        : null;

      if (typeof cellValue === 'string' || cellValue === null) {
        return cellValue;
      }

      if (typeof cellValue === 'boolean') {
        return cellValue ? 'true' : 'false';
      }

      if (typeof cellValue === 'object' && cellValue !== null) {
        return JSON.stringify(cellValue);
      }

      const split = columnId.split('.');
      let backgroundColor;
      const resultsField = jobConfig.dest.results_field;

      // column with feature values get color coded by its corresponding influencer value
      if (fullItem[`${resultsField}.${FEATURE_INFLUENCE}.${columnId}`] !== undefined) {
        backgroundColor = cellBgColor(fullItem[`${resultsField}.${FEATURE_INFLUENCE}.${columnId}`]);
      }

      // column with influencer values get color coded by its own value
      if (split.length > 2 && split[0] === resultsField && split[1] === FEATURE_INFLUENCE) {
        backgroundColor = cellBgColor(cellValue);
      }

      if (backgroundColor !== undefined) {
        setCellProps({
          style: { backgroundColor },
        });
      }

      return cellValue;
    };
  }, [jobConfig, tableItems, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    if (jobConfig !== undefined) {
      const outlierScoreFieldName = getOutlierScoreFieldName(jobConfig);
      const outlierScoreFieldSelected = selectedFields.includes(outlierScoreFieldName);
      let requiresKeyword = false;

      const field = outlierScoreFieldSelected ? outlierScoreFieldName : selectedFields[0];
      const direction = outlierScoreFieldSelected ? 'desc' : 'asc';

      if (outlierScoreFieldSelected === false) {
        requiresKeyword = isKeywordAndTextType(field);
      }

      loadExploreData({
        field,
        direction,
        searchQuery,
        requiresKeyword,
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
      });
    }
  }, [JSON.stringify(searchQuery), pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    // by default set the sorting to descending on the `outlier_score` field.
    // if that's not available sort ascending on the first column.
    // also check if the current sorting field is still available.
    if (jobConfig !== undefined && columns.length > 0 && !selectedFields.includes(sortField)) {
      const outlierScoreFieldName = getOutlierScoreFieldName(jobConfig);
      const outlierScoreFieldSelected = selectedFields.includes(outlierScoreFieldName);
      let requiresKeyword = false;

      const field = outlierScoreFieldSelected ? outlierScoreFieldName : selectedFields[0];
      const direction = outlierScoreFieldSelected ? 'desc' : 'asc';

      if (outlierScoreFieldSelected === false) {
        requiresKeyword = isKeywordAndTextType(field);
      }

      loadExploreData({ field, direction, searchQuery, requiresKeyword });
      return;
    }
  }, [jobConfig, columns.length, sortField, sortDirection, tableItems.length]);

  const onChangeItemsPerPage = useCallback(pageSize => setPagination(p => ({ ...p, pageSize })), [
    setPagination,
  ]);

  const onChangePage = useCallback(pageIndex => setPagination(p => ({ ...p, pageIndex })), [
    setPagination,
  ]);

  // ** Sorting config
  const [sortingColumns, setSortingColumns] = useState([]);
  const onSort = useCallback(
    sc => {
      setSortingColumns(sc);
    },
    [setSortingColumns]
  );

  if (columns.length > 0 && sortField !== '') {
    const onTableChange = ({
      page = { index: 0, size: 10 },
      sort = { field: sortField, direction: sortDirection },
    }) => {
      if (
        (sort.field !== sortField || sort.direction !== sortDirection) &&
        jobConfig !== undefined
      ) {
        const outlierScoreFieldName = getOutlierScoreFieldName(jobConfig);
        let requiresKeyword = false;

        if (outlierScoreFieldName !== sort.field) {
          requiresKeyword = isKeywordAndTextType(sort.field);
        }
        loadExploreData({ ...sort, searchQuery, requiresKeyword });
      }
    };
  }

  const onQueryChange = ({ query, error }: { query: QueryType; error: any }) => {
    if (error) {
      setSearchError(error.message);
    } else {
      try {
        const esQueryDsl = Query.toESQuery(query);
        setSearchQuery(esQueryDsl);
        setSearchString(query.text);
        setSearchError(undefined);
      } catch (e) {
        setSearchError(e.toString());
      }
    }
  };

  const search = {
    onChange: onQueryChange,
    defaultQuery: searchString,
    box: {
      incremental: false,
      placeholder: i18n.translate('xpack.ml.dataframe.analytics.exploration.searchBoxPlaceholder', {
        defaultMessage: 'E.g. avg>0.5',
      }),
    },
  };

  if (jobConfig === undefined) {
    return null;
  }
  // if it's a searchBar syntax error leave the table visible so they can try again
  if (status === INDEX_STATUS.ERROR && !errorMessage.includes('parsing_exception')) {
    return (
      <EuiPanel grow={false}>
        <ExplorationTitle jobId={jobConfig.id} />
        <EuiCallOut
          title={i18n.translate('xpack.ml.dataframe.analytics.exploration.indexError', {
            defaultMessage: 'An error occurred loading the index data.',
          })}
          color="danger"
          iconType="cross"
        >
          <p>{errorMessage}</p>
        </EuiCallOut>
      </EuiPanel>
    );
  }

  let tableError =
    status === INDEX_STATUS.ERROR && errorMessage.includes('parsing_exception')
      ? errorMessage
      : searchError;

  if (status === INDEX_STATUS.LOADED && tableItems.length === 0 && tableError === undefined) {
    tableError = i18n.translate('xpack.ml.dataframe.analytics.exploration.noDataCalloutBody', {
      defaultMessage:
        'The query for the index returned no results. Please make sure the index contains documents and your query is not too restrictive.',
    });
  }

  return (
    <EuiPanel
      grow={false}
      data-test-subj="mlDFAnalyticsOutlierExplorationTablePanel"
      style={{ width: '1200px' }}
    >
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              <ExplorationTitle jobId={jobConfig.id} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <span>{getTaskStateBadge(jobStatus)}</span>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {status === INDEX_STATUS.LOADING && <EuiProgress size="xs" color="accent" />}
      {status !== INDEX_STATUS.LOADING && (
        <EuiProgress size="xs" color="accent" max={1} value={0} />
      )}
      {(columns.length > 0 || searchQuery !== defaultSearchQuery) && sortField !== '' && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              {tableItems.length === SEARCH_SIZE && (
                <EuiText size="xs" color="subdued">
                  {i18n.translate(
                    'xpack.ml.dataframe.analytics.exploration.documentsShownHelpText',
                    {
                      defaultMessage: 'Showing first {searchSize} documents',
                      values: { searchSize: SEARCH_SIZE },
                    }
                  )}
                </EuiText>
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ColorRangeLegend
                colorRange={cellBgColor}
                title={i18n.translate(
                  'xpack.ml.dataframe.analytics.exploration.colorRangeLegendTitle',
                  {
                    defaultMessage: 'Feature influence score',
                  }
                )}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          {columns.length > 0 && tableItems.length > 0 && (
            <EuiDataGrid
              aria-label={i18n.translate(
                'xpack.ml.dataframe.analytics.exploration.dataGridAriaLabel',
                {
                  defaultMessage: 'Outlier detection results table',
                }
              )}
              columns={columns}
              columnVisibility={{
                visibleColumns: selectedFields,
                setVisibleColumns: setSelectedFields,
              }}
              gridStyle={euiDataGridStyle}
              rowCount={rowCount}
              renderCellValue={renderCellValue}
              sorting={{ columns: sortingColumns, onSort }}
              toolbarVisibility={euiDataGridToolbarSettings}
              pagination={{
                ...pagination,
                pageSizeOptions: PAGE_SIZE_OPTIONS,
                onChangeItemsPerPage,
                onChangePage,
              }}
            />
          )}
        </>
      )}
    </EuiPanel>
  );
});
