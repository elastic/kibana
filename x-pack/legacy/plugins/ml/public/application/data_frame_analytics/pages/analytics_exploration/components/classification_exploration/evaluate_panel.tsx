/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useEffect, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
// import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiDataGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
// import { ErrorCallout } from './error_callout';
import {
  getDependentVar,
  getPredictionFieldName,
  loadEvalData,
  // Eval,
  DataFrameAnalyticsConfig,
} from '../../../../common';
// import { ml } from '../../../../../services/ml_api_service';
import { getTaskStateBadge } from '../../../analytics_management/components/analytics_list/columns';
import { DATA_FRAME_TASK_STATE } from '../../../analytics_management/components/analytics_list/common';
import {
  // getEvalQueryBody,
  isRegressionResultsSearchBoolQuery,
  RegressionResultsSearchQuery,
  ANALYSIS_CONFIG_TYPE,
  // SearchQuery,
} from '../../../../common/analytics';

function getColumnData(confusionMatrixData: any) {
  const colData: any = [];

  confusionMatrixData.forEach((classData: any) => {
    const correctlyPredictedClass = classData.predicted_classes.find(
      (pc: any) => pc.predicted_class === classData.actual_class
    );
    const incorrectlyPredictedClass = classData.predicted_classes.find(
      (pc: any) => pc.predicted_class !== classData.actual_class
    );
    const accuracy = (correctlyPredictedClass.count / classData.actual_class_doc_count).toFixed(3);
    const error = (incorrectlyPredictedClass.count / classData.actual_class_doc_count).toFixed(3);

    colData.push({
      [correctlyPredictedClass.predicted_class]: accuracy,
      [incorrectlyPredictedClass.predicted_class]: error,
      actual_class: classData.actual_class,
      predicted_class: correctlyPredictedClass.predicted_class,
      actual_class_doc_count: classData.actual_class_doc_count,
      count: correctlyPredictedClass.count,
      error_count: incorrectlyPredictedClass.count,
      accuracy,
    });
  });

  const columns: any = [
    {
      id: 'actual_class',
      display: <span />,
    },
  ];

  colData.forEach((data: any) => {
    columns.push({ id: data.predicted_class });
  });

  return { columns, columnData: colData };
}

interface Props {
  jobConfig: DataFrameAnalyticsConfig;
  jobStatus: DATA_FRAME_TASK_STATE;
  searchQuery: RegressionResultsSearchQuery;
}

export const EvaluatePanel: FC<Props> = ({ jobConfig, jobStatus, searchQuery }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [confusionMatrixData, setConfusionMatrixData] = useState<any>([]); // TODO: update type
  const [columns, setColumns] = useState<any>([]);
  const [columnsData, setColumnsData] = useState<any>([]);
  const [popoverContents, setPopoverContents] = useState<any>([]);

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
    isTrainingClause: any; // TODO: update type
    ignoreDefaultQuery?: boolean;
  }) => {
    setIsLoading(true);
    // TODO: need some error handling here
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

    if (evalData.success === true && evalData.eval) {
      // @ts-ignore
      const confusionMatrix =
        // @ts-ignore
        evalData.eval?.classification?.multiclass_confusion_matrix?.confusion_matrix;

      setConfusionMatrixData(confusionMatrix || []);

      setIsLoading(false);
    } else {
      setIsLoading(false);
      setConfusionMatrixData([]);
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

          return `Calculated by dividing predicted label count ${count} by actual label count ${gridItem.actual_class_doc_count}`;
        },
      });
    }
  }, [confusionMatrixData]);

  useEffect(() => {
    const hasIsTrainingClause =
      isRegressionResultsSearchBoolQuery(searchQuery) &&
      searchQuery.bool.must.filter(
        (clause: any) => clause.match && clause.match[`${resultsField}.is_training`] !== undefined
      );
    const isTrainingClause =
      hasIsTrainingClause &&
      hasIsTrainingClause[0] &&
      hasIsTrainingClause[0].match[`${resultsField}.is_training`];

    loadData({ isTrainingClause });
  }, [JSON.stringify(searchQuery)]);

  const renderCellValue = ({ rowIndex, columnId }: { rowIndex: number; columnId: string }) => {
    return <span>{columnsData[rowIndex][columnId]}</span>;
  };

  if (isLoading === true) {
    // TODO: update this to proper loading
    return <EuiPanel>Loading...</EuiPanel>;
  }

  return (
    <EuiPanel>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <span>
                  {i18n.translate(
                    'xpack.ml.dataframe.analytics.classificationExploration.jobIdTitle',
                    {
                      defaultMessage: 'Classification job ID {jobId}',
                      values: { jobId: jobConfig.id },
                    }
                  )}
                </span>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <span>{getTaskStateBadge(jobStatus)}</span>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiSpacer />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormRow
                helpText={i18n.translate(
                  'xpack.ml.dataframe.analytics.classificationExploration.confusionMatrixHelpText',
                  {
                    defaultMessage: 'Normalized confusion matrix',
                  }
                )}
              >
                <Fragment />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {columns.length > 0 && (
            <Fragment>
              <EuiFlexGroup direction="column" justifyContent="center">
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
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFormRow
                    helpText={i18n.translate(
                      'xpack.ml.dataframe.analytics.classificationExploration.confusionMatrixPredictionLabel',
                      {
                        defaultMessage: 'Predicted label',
                      }
                    )}
                  >
                    <Fragment />
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
            </Fragment>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
