/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { escapeKuery } from '@kbn/es-query';
import { cloneDeep } from 'lodash';
import moment from 'moment';

import type { EuiDataGridColumn, EuiDataGridProps } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';

import type { DataView } from '@kbn/data-views-plugin/public';
import { type MlKibanaUrlConfig } from '@kbn/ml-anomaly-utils';
import { ES_CLIENT_TOTAL_HITS_RELATION } from '@kbn/ml-query-utils';
import type { RowCountRelation, UseIndexDataReturnType } from '@kbn/ml-data-grid';
import { type DataGridItem, DataGrid, INDEX_STATUS } from '@kbn/ml-data-grid';
import {
  getAnalysisType,
  isClassificationAnalysis,
  isRegressionAnalysis,
  type DataFrameAnalyticsConfig,
} from '@kbn/ml-data-frame-analytics-utils';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { SEARCH_QUERY_LANGUAGE } from '@kbn/ml-query-utils';
import { parseInterval } from '@kbn/ml-parse-interval';

import type { useColorRange } from '../../../../../components/color_range_legend';
import { ColorRangeLegend } from '../../../../../components/color_range_legend';
import { useMlKibana } from '../../../../../contexts/kibana';

import { defaultSearchQuery, renderCellPopoverFactory, SEARCH_SIZE } from '../../../../common';

import {
  replaceTokensInDFAUrlValue,
  openCustomUrlWindow,
} from '../../../../../util/custom_url_utils';
import { replaceStringTokens } from '../../../../../util/string_utils';

import type { ExpandableSectionProps } from '.';
import { ExpandableSection, HEADER_ITEMS_LOADING } from '.';
import { DataViewPrompt } from '../data_view_prompt';

const showingDocs = i18n.translate(
  'xpack.ml.dataframe.analytics.explorationResults.documentsShownHelpText',
  {
    defaultMessage: 'Showing documents for which predictions exist',
  }
);

const showingFirstDocs = i18n.translate(
  'xpack.ml.dataframe.analytics.explorationResults.firstDocumentsShownHelpText',
  {
    defaultMessage: 'Showing first {searchSize} documents for which predictions exist',
    values: { searchSize: SEARCH_SIZE },
  }
);

const getResultsSectionHeaderItems = (
  columnsWithCharts: EuiDataGridColumn[],
  status: INDEX_STATUS,
  tableItems: Array<Record<string, any>>,
  rowCount: number,
  rowCountRelation: RowCountRelation,
  colorRange?: ReturnType<typeof useColorRange>
): ExpandableSectionProps['headerItems'] => {
  return columnsWithCharts.length > 0 && (tableItems.length > 0 || status === INDEX_STATUS.LOADED)
    ? [
        {
          id: 'explorationTableTotalDocs',
          label: (
            <FormattedMessage
              id="xpack.ml.dataframe.analytics.exploration.explorationTableTotalDocsLabel"
              defaultMessage="Total docs"
            />
          ),
          value: `${rowCountRelation === ES_CLIENT_TOTAL_HITS_RELATION.GTE ? '>' : ''}${rowCount}`,
        },
        ...(colorRange !== undefined
          ? [
              {
                id: 'colorRangeLegend',
                value: (
                  <ColorRangeLegend
                    colorRange={colorRange}
                    title={i18n.translate(
                      'xpack.ml.dataframe.analytics.exploration.colorRangeLegendTitle',
                      {
                        defaultMessage: 'Feature influence score',
                      }
                    )}
                  />
                ),
              },
            ]
          : []),
      ]
    : HEADER_ITEMS_LOADING;
};

interface ExpandableSectionResultsProps {
  colorRange?: ReturnType<typeof useColorRange>;
  indexData: UseIndexDataReturnType;
  dataView?: DataView;
  jobConfig?: DataFrameAnalyticsConfig;
  needsDestDataView: boolean;
  resultsField?: string;
  searchQuery: estypes.QueryDslQueryContainer;
}

export const ExpandableSectionResults: FC<ExpandableSectionResultsProps> = ({
  colorRange,
  indexData,
  dataView,
  jobConfig,
  needsDestDataView,
  resultsField,
  searchQuery,
}) => {
  const {
    services: {
      application,
      share,
      data,
      http: { basePath },
      notifications: { toasts },
    },
  } = useMlKibana();
  const {
    euiTheme: { size },
  } = useEuiTheme();

  const dataViewId = dataView?.id;

  const discoverLocator = useMemo(
    () => share.url.locators.get('DISCOVER_APP_LOCATOR'),
    [share.url.locators]
  );

  const discoverUrlError = useMemo(() => {
    if (!application.capabilities.discover_v2?.show) {
      const discoverNotEnabled = i18n.translate(
        'xpack.ml.dataframe.analytics.exploration.dataGridActions.discoverNotEnabledErrorMessage',
        {
          defaultMessage: 'Discover is not enabled',
        }
      );

      return discoverNotEnabled;
    }
    if (!discoverLocator) {
      const discoverLocatorMissing = i18n.translate(
        'xpack.ml.dataframe.analytics.exploration.dataGridActions.discoverLocatorMissingErrorMessage',
        {
          defaultMessage: 'No locator for Discover detected',
        }
      );

      return discoverLocatorMissing;
    }
    if (!dataViewId) {
      const autoGeneratedDiscoverLinkError = i18n.translate(
        'xpack.ml.dataframe.analytics.exploration.dataGridActions.autoGeneratedDiscoverLinkErrorMessage',
        {
          defaultMessage: 'Unable to link to Discover; no data view exists for this index',
        }
      );

      return autoGeneratedDiscoverLinkError;
    }
  }, [application.capabilities.discover_v2?.show, dataViewId, discoverLocator]);

  const { columnsWithCharts, status, tableItems } = indexData;

  // Results section header items and content
  const resultsSectionHeaderItems = getResultsSectionHeaderItems(
    columnsWithCharts,
    status,
    tableItems,
    indexData.rowCount,
    indexData.rowCountRelation,
    colorRange
  );
  const analysisType =
    jobConfig && jobConfig.analysis ? getAnalysisType(jobConfig.analysis) : undefined;

  const generateDiscoverUrl = useCallback(
    async (rowIndex: number) => {
      const item = tableItems[rowIndex];

      if (discoverLocator !== undefined) {
        const url = await discoverLocator.getRedirectUrl({
          dataViewId,
          timeRange: data.query.timefilter.timefilter.getTime(),
          filters: data.query.filterManager.getFilters(),
          query: {
            language: SEARCH_QUERY_LANGUAGE.KUERY,
            // Filter for all visible column values of supported types - except the results field values
            query: indexData.visibleColumns
              .filter(
                (column) =>
                  item[column] !== undefined &&
                  (typeof item[column] === 'string' || typeof item[column] === 'number') &&
                  !column.includes(resultsField!)
              )
              .map((column) => `${escapeKuery(column)}:${escapeKuery(String(item[column]))}`)
              .join(' and '),
          },
        });

        return url;
      }
    },
    [indexData?.visibleColumns, discoverLocator, dataViewId, resultsField, tableItems, data]
  );

  const openCustomUrl = (item: DataGridItem, customUrl: MlKibanaUrlConfig) => {
    const timeRangeInterval =
      customUrl.time_range !== undefined ? parseInterval(customUrl.time_range) : null;
    let urlPath;

    // Interval time range
    if (timeRangeInterval !== null) {
      // Create a copy of the record as we are adding properties into it.
      const record = cloneDeep(item);
      const timestamp = record[dataView!.timeFieldName!];
      const configuredUrlValue = customUrl.url_value;

      if (configuredUrlValue.includes('$earliest$')) {
        const earliestMoment = moment(timestamp);
        earliestMoment.subtract(timeRangeInterval);
        record.earliest = earliestMoment.toISOString(); // e.g. 2016-02-08T16:00:00.000Z
      }

      if (configuredUrlValue.includes('$latest$')) {
        const latestMoment = moment(timestamp);
        latestMoment.add(timeRangeInterval);
        record.latest = latestMoment.toISOString();
      }

      urlPath = replaceStringTokens(customUrl.url_value, record, true);
    } else {
      // Custom time range
      // Replace any tokens in the configured url_value with values from the source record and open link in a new tab/window.
      urlPath = replaceTokensInDFAUrlValue(
        customUrl,
        item,
        data.query.timefilter.timefilter.getTime()
      );
    }

    openCustomUrlWindow(urlPath, customUrl, basePath.get());
  };

  const trailingControlColumns: EuiDataGridProps['trailingControlColumns'] = [
    {
      id: 'actions',
      width: 60,
      headerCellRender: () => (
        <FormattedMessage
          id="xpack.ml.dataframe.analytics.exploration.dataGridActions.columnTitle"
          defaultMessage="Actions"
        />
      ),
      rowCellRender: function RowCellRender({ rowIndex }) {
        const item = tableItems[rowIndex];
        const [isPopoverVisible, setIsPopoverVisible] = useState(false);
        const closePopover = () => setIsPopoverVisible(false);

        const actions = [
          <EuiContextMenuItem
            icon="discoverApp"
            key="custom_discover_url"
            disabled={discoverUrlError !== undefined}
            onClick={async () => {
              const openInDiscoverUrl = await generateDiscoverUrl(rowIndex);
              if (openInDiscoverUrl) {
                application.navigateToUrl(openInDiscoverUrl);
              }
            }}
          >
            {discoverUrlError ? (
              <EuiToolTip content={discoverUrlError}>
                <FormattedMessage
                  id="xpack.ml.dataframe.analytics.exploration.dataGridActions.viewInDiscover"
                  defaultMessage="View in Discover"
                />
              </EuiToolTip>
            ) : (
              <FormattedMessage
                id="xpack.ml.dataframe.analytics.exploration.dataGridActions.viewInDiscover"
                defaultMessage="View in Discover"
              />
            )}
          </EuiContextMenuItem>,
        ];

        if (jobConfig && jobConfig._meta && Array.isArray(jobConfig._meta.custom_urls)) {
          jobConfig?._meta.custom_urls.forEach((customUrl, index) => {
            actions.push(
              <EuiContextMenuItem
                key={`custom_url_${index}`}
                icon="popout"
                onClick={() => {
                  closePopover();
                  openCustomUrl(item, customUrl);
                }}
                data-test-subj={`mlExplorationDataGridRowActionCustomUrlButton_${index}`}
              >
                {customUrl.url_name}
              </EuiContextMenuItem>
            );
          });
        }

        return (
          <EuiPopover
            isOpen={isPopoverVisible}
            panelPaddingSize="none"
            anchorPosition="upCenter"
            button={
              <EuiButtonIcon
                aria-label={i18n.translate(
                  'xpack.ml.dataframe.analytics.exploration.dataGridActions.showActionsAriaLabel',
                  {
                    defaultMessage: 'Show actions',
                  }
                )}
                iconType="gear"
                color="text"
                onClick={() => setIsPopoverVisible(!isPopoverVisible)}
              />
            }
            closePopover={closePopover}
          >
            <EuiContextMenuPanel items={actions} size="s" />
          </EuiPopover>
        );
      },
    },
  ];

  const renderCellPopover = useMemo(
    () =>
      renderCellPopoverFactory({
        analysisType,
        baseline: indexData.baseline,
        data: indexData.tableItems,
        pagination: indexData.pagination,
        predictionFieldName: indexData.predictionFieldName,
        resultsField: indexData.resultsField,
      }),
    [
      analysisType,
      indexData.baseline,
      indexData.tableItems,
      indexData.pagination,
      indexData.predictionFieldName,
      indexData.resultsField,
    ]
  );

  const resultsSectionContent = (
    <>
      {jobConfig !== undefined && needsDestDataView && (
        <DataViewPrompt destIndex={jobConfig.dest.index} />
      )}
      {jobConfig !== undefined &&
        (isRegressionAnalysis(jobConfig.analysis) ||
          isClassificationAnalysis(jobConfig.analysis)) && (
          <EuiText size="xs" color="subdued" css={{ padding: `${size.s}` }}>
            {tableItems.length === SEARCH_SIZE ? showingFirstDocs : showingDocs}
          </EuiText>
        )}
      {(columnsWithCharts.length > 0 || searchQuery !== defaultSearchQuery) &&
        dataView !== undefined && (
          <>
            {columnsWithCharts.length > 0 &&
              (tableItems.length > 0 || status === INDEX_STATUS.LOADED) && (
                <DataGrid
                  {...indexData}
                  trailingControlColumns={
                    indexData.visibleColumns.length ? trailingControlColumns : undefined
                  }
                  dataTestSubj="mlExplorationDataGrid"
                  renderCellPopover={renderCellPopover}
                  toastNotifications={toasts}
                />
              )}
          </>
        )}
    </>
  );

  return (
    <>
      <ExpandableSection
        urlStateKey={'results'}
        dataTestId="results"
        content={resultsSectionContent}
        headerItems={resultsSectionHeaderItems}
        title={
          <FormattedMessage
            id="xpack.ml.dataframe.analytics.exploration.explorationTableTitle"
            defaultMessage="Results"
          />
        }
      />
      <EuiSpacer size="m" />
    </>
  );
};
