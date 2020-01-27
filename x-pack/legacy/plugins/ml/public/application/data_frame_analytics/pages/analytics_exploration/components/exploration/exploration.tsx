/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState } from 'react';
import moment from 'moment-timezone';

import { i18n } from '@kbn/i18n';

import {
  EuiBadge,
  EuiButtonIcon,
  EuiCallOut,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiPopoverTitle,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  Query,
} from '@elastic/eui';

import {
  useColorRange,
  ColorRangeLegend,
  COLOR_RANGE,
  COLOR_RANGE_SCALE,
} from '../../../../../components/color_range_legend';
import {
  ColumnType,
  mlInMemoryTableBasicFactory,
  OnTableChangeArg,
  SortingPropType,
  SORT_DIRECTION,
} from '../../../../../components/ml_in_memory_table';

import { formatHumanReadableDateTimeSeconds } from '../../../../../util/date_utils';
import { ml } from '../../../../../services/ml_api_service';

import {
  sortColumns,
  toggleSelectedField,
  DataFrameAnalyticsConfig,
  EsFieldName,
  EsDoc,
  MAX_COLUMNS,
  INDEX_STATUS,
  SEARCH_SIZE,
  defaultSearchQuery,
} from '../../../../common';

import { getOutlierScoreFieldName } from './common';
import { useExploreData, TableItem } from './use_explore_data';
import {
  DATA_FRAME_TASK_STATE,
  Query as QueryType,
} from '../../../analytics_management/components/analytics_list/common';
import { getTaskStateBadge } from '../../../analytics_management/components/analytics_list/columns';
import { SavedSearchQuery } from '../../../../../contexts/kibana';

const FEATURE_INFLUENCE = 'feature_influence';

interface GetDataFrameAnalyticsResponse {
  count: number;
  data_frame_analytics: DataFrameAnalyticsConfig[];
}

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

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const [searchQuery, setSearchQuery] = useState<SavedSearchQuery>(defaultSearchQuery);
  const [searchError, setSearchError] = useState<any>(undefined);
  const [searchString, setSearchString] = useState<string | undefined>(undefined);

  useEffect(() => {
    (async function() {
      const analyticsConfigs: GetDataFrameAnalyticsResponse = await ml.dataFrameAnalytics.getDataFrameAnalytics(
        jobId
      );
      if (
        Array.isArray(analyticsConfigs.data_frame_analytics) &&
        analyticsConfigs.data_frame_analytics.length > 0
      ) {
        setJobConfig(analyticsConfigs.data_frame_analytics[0]);
      }
    })();
  }, []);

  const [selectedFields, setSelectedFields] = useState([] as EsFieldName[]);
  const [isColumnsPopoverVisible, setColumnsPopoverVisible] = useState(false);

  function toggleColumnsPopover() {
    setColumnsPopoverVisible(!isColumnsPopoverVisible);
  }

  function closeColumnsPopover() {
    setColumnsPopoverVisible(false);
  }

  function toggleColumn(column: EsFieldName) {
    if (tableItems.length > 0 && jobConfig !== undefined) {
      // spread to a new array otherwise the component wouldn't re-render
      setSelectedFields([...toggleSelectedField(selectedFields, column)]);
    }
  }

  const {
    errorMessage,
    loadExploreData,
    sortField,
    sortDirection,
    status,
    tableItems,
  } = useExploreData(jobConfig, selectedFields, setSelectedFields);

  let docFields: EsFieldName[] = [];
  let docFieldsCount = 0;
  if (tableItems.length > 0) {
    docFields = Object.keys(tableItems[0]);
    docFields.sort();
    docFieldsCount = docFields.length;
  }

  const columns: Array<ColumnType<TableItem>> = [];

  const cellBgColor = useColorRange(
    COLOR_RANGE.BLUE,
    COLOR_RANGE_SCALE.INFLUENCER,
    getFeatureCount(jobConfig, tableItems)
  );

  if (jobConfig !== undefined && selectedFields.length > 0 && tableItems.length > 0) {
    columns.push(
      ...selectedFields.sort(sortColumns(tableItems[0], jobConfig.dest.results_field)).map(k => {
        const column: ColumnType<TableItem> = {
          field: k,
          name: k,
          sortable: true,
          truncateText: true,
        };

        const render = (d: any, fullItem: EsDoc) => {
          if (Array.isArray(d) && d.every(item => typeof item === 'string')) {
            // If the cells data is an array of strings, return as a comma separated list.
            // The list will get limited to 5 items with `…` at the end if there's more in the original array.
            return `${d.slice(0, 5).join(', ')}${d.length > 5 ? ', …' : ''}`;
          } else if (Array.isArray(d)) {
            // If the cells data is an array of e.g. objects, display a 'array' badge with a
            // tooltip that explains that this type of field is not supported in this table.
            return (
              <EuiToolTip
                content={i18n.translate(
                  'xpack.ml.dataframe.analytics.exploration.indexArrayToolTipContent',
                  {
                    defaultMessage:
                      'The full content of this array based column cannot be displayed.',
                  }
                )}
              >
                <EuiBadge>
                  {i18n.translate(
                    'xpack.ml.dataframe.analytics.exploration.indexArrayBadgeContent',
                    {
                      defaultMessage: 'array',
                    }
                  )}
                </EuiBadge>
              </EuiToolTip>
            );
          } else if (typeof d === 'object' && d !== null) {
            // If the cells data is an object, display a 'object' badge with a
            // tooltip that explains that this type of field is not supported in this table.
            return (
              <EuiToolTip
                content={i18n.translate(
                  'xpack.ml.dataframe.analytics.exploration.indexObjectToolTipContent',
                  {
                    defaultMessage:
                      'The full content of this object based column cannot be displayed.',
                  }
                )}
              >
                <EuiBadge>
                  {i18n.translate(
                    'xpack.ml.dataframe.analytics.exploration.indexObjectBadgeContent',
                    {
                      defaultMessage: 'object',
                    }
                  )}
                </EuiBadge>
              </EuiToolTip>
            );
          }

          const split = k.split('.');
          let backgroundColor;
          const color = undefined;
          const resultsField = jobConfig.dest.results_field;

          if (fullItem[`${resultsField}.${FEATURE_INFLUENCE}.${k}`] !== undefined) {
            backgroundColor = cellBgColor(fullItem[`${resultsField}.${FEATURE_INFLUENCE}.${k}`]);
          }

          if (split.length > 2 && split[0] === resultsField && split[1] === FEATURE_INFLUENCE) {
            backgroundColor = cellBgColor(d);
          }

          return (
            <div
              className="mlColoredTableCell"
              style={{
                backgroundColor,
                color,
              }}
            >
              {d}
            </div>
          );
        };

        let columnType;

        if (tableItems.length > 0) {
          columnType = typeof tableItems[0][k];
        }

        if (typeof columnType !== 'undefined') {
          switch (columnType) {
            case 'boolean':
              column.dataType = 'boolean';
              break;
            case 'Date':
              column.align = 'right';
              column.render = (d: any) =>
                formatHumanReadableDateTimeSeconds(moment(d).unix() * 1000);
              break;
            case 'number':
              column.dataType = 'number';
              column.render = render;
              break;
            default:
              column.render = render;
              break;
          }
        } else {
          column.render = render;
        }

        return column;
      })
    );
  }

  useEffect(() => {
    if (jobConfig !== undefined) {
      const outlierScoreFieldName = getOutlierScoreFieldName(jobConfig);
      const outlierScoreFieldSelected = selectedFields.includes(outlierScoreFieldName);

      const field = outlierScoreFieldSelected ? outlierScoreFieldName : selectedFields[0];
      const direction = outlierScoreFieldSelected ? SORT_DIRECTION.DESC : SORT_DIRECTION.ASC;
      loadExploreData({ field, direction, searchQuery });
    }
  }, [JSON.stringify(searchQuery)]);

  useEffect(() => {
    // by default set the sorting to descending on the `outlier_score` field.
    // if that's not available sort ascending on the first column.
    // also check if the current sorting field is still available.
    if (jobConfig !== undefined && columns.length > 0 && !selectedFields.includes(sortField)) {
      const outlierScoreFieldName = getOutlierScoreFieldName(jobConfig);
      const outlierScoreFieldSelected = selectedFields.includes(outlierScoreFieldName);

      const field = outlierScoreFieldSelected ? outlierScoreFieldName : selectedFields[0];
      const direction = outlierScoreFieldSelected ? SORT_DIRECTION.DESC : SORT_DIRECTION.ASC;
      loadExploreData({ field, direction, searchQuery });
      return;
    }
  }, [jobConfig, columns.length, sortField, sortDirection, tableItems.length]);

  let sorting: SortingPropType = false;
  let onTableChange;

  if (columns.length > 0 && sortField !== '') {
    sorting = {
      sort: {
        field: sortField,
        direction: sortDirection,
      },
    };

    onTableChange = ({
      page = { index: 0, size: 10 },
      sort = { field: sortField, direction: sortDirection },
    }: OnTableChangeArg) => {
      const { index, size } = page;
      setPageIndex(index);
      setPageSize(size);

      if (sort.field !== sortField || sort.direction !== sortDirection) {
        loadExploreData({ ...sort, searchQuery });
      }
    };
  }

  const pagination = {
    initialPageIndex: pageIndex,
    initialPageSize: pageSize,
    totalItemCount: tableItems.length,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    hidePerPageOptions: false,
  };

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

  const MlInMemoryTableBasic = mlInMemoryTableBasicFactory<TableItem>();

  return (
    <EuiPanel grow={false}>
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
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
            <EuiFlexItem style={{ textAlign: 'right' }}>
              {docFieldsCount > MAX_COLUMNS && (
                <EuiText size="s">
                  {i18n.translate('xpack.ml.dataframe.analytics.exploration.fieldSelection', {
                    defaultMessage:
                      '{selectedFieldsLength, number} of {docFieldsCount, number} {docFieldsCount, plural, one {field} other {fields}} selected',
                    values: { selectedFieldsLength: selectedFields.length, docFieldsCount },
                  })}
                </EuiText>
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <EuiPopover
                  id="popover"
                  button={
                    <EuiButtonIcon
                      iconType="gear"
                      onClick={toggleColumnsPopover}
                      aria-label={i18n.translate(
                        'xpack.ml.dataframe.analytics.exploration.selectColumnsAriaLabel',
                        {
                          defaultMessage: 'Select columns',
                        }
                      )}
                    />
                  }
                  isOpen={isColumnsPopoverVisible}
                  closePopover={closeColumnsPopover}
                  ownFocus
                >
                  <EuiPopoverTitle>
                    {i18n.translate(
                      'xpack.ml.dataframe.analytics.exploration.selectFieldsPopoverTitle',
                      {
                        defaultMessage: 'Select fields',
                      }
                    )}
                  </EuiPopoverTitle>
                  <div style={{ maxHeight: '400px', overflowY: 'scroll' }}>
                    {docFields.map(d => (
                      <EuiCheckbox
                        key={d}
                        id={d}
                        label={d}
                        checked={selectedFields.includes(d)}
                        onChange={() => toggleColumn(d)}
                        disabled={selectedFields.includes(d) && selectedFields.length === 1}
                      />
                    ))}
                  </div>
                </EuiPopover>
              </EuiText>
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
          <MlInMemoryTableBasic
            allowNeutralSort={false}
            className="mlDataFrameAnalyticsExploration"
            columns={columns}
            compressed
            hasActions={false}
            isSelectable={false}
            items={tableItems}
            onTableChange={onTableChange}
            pagination={pagination}
            responsive={false}
            sorting={sorting}
            search={search}
            error={tableError}
          />
        </>
      )}
    </EuiPanel>
  );
});
