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
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import {
  esKuery,
  esQuery,
  Query,
  QueryStringInput,
} from '../../../../../../../../../../../src/plugins/data/public';

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
  defaultSearchQuery,
} from '../../../../common';
import { isKeywordAndTextType } from '../../../../common/fields';

import { getOutlierScoreFieldName } from './common';
import { useExploreData, TableItem } from './use_explore_data';
import { DATA_FRAME_TASK_STATE } from '../../../analytics_management/components/analytics_list/common';
import { getTaskStateBadge } from '../../../analytics_management/components/analytics_list/columns';
import { SavedSearchQuery } from '../../../../../contexts/ml';
import { getIndexPatternIdFromName } from '../../../../../util/index_utils';
import { IIndexPattern } from '../../../../../../../../../../../src/plugins/data/common/index_patterns';
import { newJobCapsService } from '../../../../../services/new_job_capabilities_service';
import { useMlContext } from '../../../../../contexts/ml';

const FEATURE_INFLUENCE = 'feature_influence';

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

const QUERY_LANGUAGE_KUERY = 'kuery';
const QUERY_LANGUAGE_LUCENE = 'lucene';

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
  const [indexPattern, setIndexPattern] = useState<IIndexPattern | undefined>(undefined);
  const [jobConfig, setJobConfig] = useState<DataFrameAnalyticsConfig | undefined>(undefined);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });
  const [searchQuery, setSearchQuery] = useState<SavedSearchQuery>(defaultSearchQuery);

  // The internal state of the input query bar updated on every key stroke.
  const [searchInput, setSearchInput] = useState<Query>({
    query: '',
    language: QUERY_LANGUAGE_KUERY,
  });

  const mlContext = useMlContext();

  const initializeJobCapsService = async () => {
    if (jobConfig !== undefined) {
      const sourceIndex = jobConfig.source.index[0];
      const indexPatternId = getIndexPatternIdFromName(sourceIndex) || sourceIndex;
      const jobCapsIndexPattern: IIndexPattern = await mlContext.indexPatterns.get(indexPatternId);
      if (jobCapsIndexPattern !== undefined) {
        setIndexPattern(jobCapsIndexPattern);
        await newJobCapsService.initializeFromIndexPattern(jobCapsIndexPattern, false, false);
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

  const searchChangeHandler = (query: Query) => setSearchInput(query);
  const searchSubmitHandler = (query: Query) => {
    switch (query.language) {
      case QUERY_LANGUAGE_KUERY:
        setSearchQuery(
          esKuery.toElasticsearchQuery(
            esKuery.fromKueryExpression(query.query as string),
            indexPattern
          )
        );
        return;
      case QUERY_LANGUAGE_LUCENE:
        setSearchQuery(esQuery.luceneStringToDsl(query.query as string));
        return;
    }
  };

  if (jobConfig === undefined || indexPattern === undefined) {
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
      : undefined;

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
      <EuiHorizontalRule margin="xs" />
      {(columns.length > 0 || searchQuery !== defaultSearchQuery) && sortField !== '' && (
        <>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem>
              <QueryStringInput
                bubbleSubmitEvent={true}
                query={searchInput}
                indexPatterns={[indexPattern]}
                onChange={searchChangeHandler}
                onSubmit={searchSubmitHandler}
                placeholder={
                  searchInput.language === QUERY_LANGUAGE_KUERY
                    ? i18n.translate('xpack.transform.stepDefineForm.queryPlaceholderKql', {
                        defaultMessage: 'e.g. {example}',
                        values: { example: 'method : "GET" or status : "404"' },
                      })
                    : i18n.translate('xpack.transform.stepDefineForm.queryPlaceholderLucene', {
                        defaultMessage: 'e.g. {example}',
                        values: { example: 'method:GET OR status:404' },
                      })
                }
                disableAutoFocus={true}
                dataTestSubj="transformQueryInput"
                languageSwitcherPopoverAnchorPosition="rightDown"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSpacer size="s" />
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
          <EuiSpacer size="s" />
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
