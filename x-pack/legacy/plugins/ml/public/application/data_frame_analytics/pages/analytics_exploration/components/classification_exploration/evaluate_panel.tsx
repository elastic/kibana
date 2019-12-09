/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useEffect, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiDataGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { ErrorCallout } from '../error_callout';
import {
  getDependentVar,
  getPredictionFieldName,
  loadEvalData,
  loadDocsCount,
  DataFrameAnalyticsConfig,
} from '../../../../common';
import { getTaskStateBadge } from '../../../analytics_management/components/analytics_list/columns';
import { DATA_FRAME_TASK_STATE } from '../../../analytics_management/components/analytics_list/common';
import {
  isResultsSearchBoolQuery,
  isClassificationEvaluateResponse,
  ClassificationEvaluateResponse,
  ResultsSearchQuery,
  ANALYSIS_CONFIG_TYPE,
} from '../../../../common/analytics';
import { LoadingPanel } from '../loading_panel';
import { getColumnData } from './column_data';

interface Props {
  jobConfig: DataFrameAnalyticsConfig;
  jobStatus: DATA_FRAME_TASK_STATE;
  searchQuery: ResultsSearchQuery;
}

export const EvaluatePanel: FC<Props> = ({ jobConfig, jobStatus, searchQuery }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [confusionMatrixData, setConfusionMatrixData] = useState<
    ClassificationEvaluateResponse['classification']['multiclass_confusion_matrix']['confusion_matrix']
  >([]);
  const [columns, setColumns] = useState<any>([]);
  const [columnsData, setColumnsData] = useState<any>([]);
  const [popoverContents, setPopoverContents] = useState<any>([]);
  const [docsCount, setDocsCount] = useState<null | number>(null);
  const [error, setError] = useState<null | string>(null);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState(() =>
    columns.map(({ id }: { id: string }) => id)
  );

  const index = jobConfig.dest.index;
  const dependentVariable = getDependentVar(jobConfig.analysis);
  const predictionFieldName = getPredictionFieldName(jobConfig.analysis);
  // default is 'ml'
  const resultsField = jobConfig.dest.results_field;

  const loadData = async ({
    isTrainingClause,
    ignoreDefaultQuery = true,
  }: {
    isTrainingClause: { query: string; operator: string };
    ignoreDefaultQuery?: boolean;
  }) => {
    setIsLoading(true);

    const evalData = await loadEvalData({
      isTraining: false,
      index,
      dependentVariable,
      resultsField,
      predictionFieldName,
      searchQuery,
      ignoreDefaultQuery,
      jobType: ANALYSIS_CONFIG_TYPE.CLASSIFICATION,
    });

    const docsCountResp = await loadDocsCount({
      isTraining: false,
      searchQuery,
      resultsField,
      destIndex: jobConfig.dest.index,
    });

    if (
      evalData.success === true &&
      evalData.eval &&
      isClassificationEvaluateResponse(evalData.eval)
    ) {
      const confusionMatrix =
        evalData.eval?.classification?.multiclass_confusion_matrix?.confusion_matrix;
      setError(null);
      setConfusionMatrixData(confusionMatrix || []);
      setIsLoading(false);
    } else {
      setIsLoading(false);
      setConfusionMatrixData([]);
      setError(evalData.error);
    }

    if (docsCountResp.success === true) {
      setDocsCount(docsCountResp.docsCount);
    } else {
      setDocsCount(null);
    }
  };

  useEffect(() => {
    if (confusionMatrixData.length > 0) {
      const { columns: derivedColumns, columnData } = getColumnData(confusionMatrixData);
      // Initialize all columns as visible
      setVisibleColumns(() => derivedColumns.map(({ id }: { id: string }) => id));
      setColumns(derivedColumns);
      setColumnsData(columnData);
      setPopoverContents({
        numeric: ({
          cellContentsElement,
          children,
        }: {
          cellContentsElement: any;
          children: any;
        }) => {
          const rowIndex = children?.props?.rowIndex;
          const colId = children?.props?.columnId;
          const gridItem = columnData[rowIndex];
          const count = colId === gridItem.actual_class ? gridItem.count : gridItem.error_count;

          return `${count} / ${gridItem.actual_class_doc_count} * 100 = ${cellContentsElement.textContent}`;
        },
      });
    }
  }, [confusionMatrixData]);

  useEffect(() => {
    const hasIsTrainingClause =
      isResultsSearchBoolQuery(searchQuery) &&
      searchQuery.bool.must.filter(
        (clause: any) => clause.match && clause.match[`${resultsField}.is_training`] !== undefined
      );
    const isTrainingClause =
      hasIsTrainingClause &&
      hasIsTrainingClause[0] &&
      hasIsTrainingClause[0].match[`${resultsField}.is_training`];

    loadData({ isTrainingClause });
  }, [JSON.stringify(searchQuery)]);

  const renderCellValue = ({
    rowIndex,
    columnId,
    setCellProps,
  }: {
    rowIndex: number;
    columnId: string;
    setCellProps: any;
  }) => {
    const cellValue = columnsData[rowIndex][columnId];
    setCellProps({
      style: {
        backgroundColor: `rgba(0, 179, 164, ${cellValue})`,
      },
    });

    return <span>{typeof cellValue === 'number' ? `${cellValue * 100}%` : cellValue}</span>;
  };

  if (isLoading === true) {
    return <LoadingPanel />;
  }

  return (
    <EuiPanel>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <span>
                  {i18n.translate(
                    'xpack.ml.dataframe.analytics.classificationExploration.jobIdTitle',
                    {
                      defaultMessage: 'Evaluation of classification job ID {jobId}',
                      values: { jobId: jobConfig.id },
                    }
                  )}
                </span>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <span>{getTaskStateBadge(jobStatus)}</span>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {error !== null && (
          <EuiFlexItem grow={false}>
            <ErrorCallout error={error} />
          </EuiFlexItem>
        )}
        {error === null && (
          <Fragment>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xxs">
                <span>
                  {i18n.translate(
                    'xpack.ml.dataframe.analytics.classificationExploration.confusionMatrixHelpText',
                    {
                      defaultMessage: 'Normalized confusion matrix',
                    }
                  )}
                </span>
              </EuiTitle>
              {docsCount !== null && (
                <EuiText size="xs" color="subdued">
                  <FormattedMessage
                    id="xpack.ml.dataframe.analytics.classificationExploration.generalizationDocsCount"
                    defaultMessage="{docsCount, plural, one {# doc} other {# docs}} evaluated"
                    values={{ docsCount }}
                  />
                </EuiText>
              )}
            </EuiFlexItem>
            {/* BEGIN TABLE ELEMENTS */}
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiFormRow
                    className="mlDataFrameAnalyticsClassification__actualLabel"
                    helpText={i18n.translate(
                      'xpack.ml.dataframe.analytics.classificationExploration.confusionMatrixActualLabel',
                      {
                        defaultMessage: 'Actual label',
                      }
                    )}
                  >
                    <Fragment />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  {columns.length > 0 && (
                    <Fragment>
                      <EuiFlexGroup direction="column" justifyContent="center" gutterSize="s">
                        <EuiFlexItem grow={false}>
                          <EuiFlexGroup>
                            <EuiFlexItem>
                              <EuiSpacer />
                            </EuiFlexItem>
                            <EuiFlexItem>
                              <EuiSpacer />
                            </EuiFlexItem>
                            <EuiFlexItem>
                              <EuiFormRow
                                helpText={i18n.translate(
                                  'xpack.ml.dataframe.analytics.classificationExploration.confusionMatrixPredictedLabel',
                                  {
                                    defaultMessage: 'Predicted label',
                                  }
                                )}
                              >
                                <Fragment />
                              </EuiFormRow>
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiDataGrid
                            aria-label="Data grid demo"
                            columns={columns}
                            columnVisibility={{ visibleColumns, setVisibleColumns }}
                            rowCount={columnsData.length}
                            renderCellValue={renderCellValue}
                            inMemory={{ level: 'sorting' }}
                            toolbarVisibility={false}
                            popoverContents={popoverContents}
                            gridStyle={{ rowHover: 'none' }}
                          />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </Fragment>
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </Fragment>
        )}
        {/* END TABLE ELEMENTS */}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
