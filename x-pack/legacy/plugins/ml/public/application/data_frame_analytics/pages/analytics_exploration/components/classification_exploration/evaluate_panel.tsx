/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useEffect, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButtonEmpty,
  EuiDataGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { metadata } from 'ui/metadata';
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
  ConfusionMatrix,
  ResultsSearchQuery,
  ANALYSIS_CONFIG_TYPE,
} from '../../../../common/analytics';
import { IIndexPattern } from '../../../../../../../../../../../src/plugins/data/common/index_patterns';
import { ES_FIELD_TYPES } from '../../../../../../../../../../../src/plugins/data/public';
import { LoadingPanel } from '../loading_panel';
import { getColumnData } from './column_data';
import { useKibanaContext } from '../../../../../contexts/kibana';
import { newJobCapsService } from '../../../../../services/new_job_capabilities_service';
import { getIndexPatternIdFromName } from '../../../../../util/index_utils';

const defaultPanelWidth = 500;

interface Props {
  jobConfig: DataFrameAnalyticsConfig;
  jobStatus: DATA_FRAME_TASK_STATE;
  searchQuery: ResultsSearchQuery;
}

export const EvaluatePanel: FC<Props> = ({ jobConfig, jobStatus, searchQuery }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [confusionMatrixData, setConfusionMatrixData] = useState<ConfusionMatrix[]>([]);
  const [columns, setColumns] = useState<any>([]);
  const [columnsData, setColumnsData] = useState<any>([]);
  const [popoverContents, setPopoverContents] = useState<any>([]);
  const [docsCount, setDocsCount] = useState<null | number>(null);
  const [error, setError] = useState<null | string>(null);
  const [panelWidth, setPanelWidth] = useState<number>(defaultPanelWidth);
  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState(() =>
    columns.map(({ id }: { id: string }) => id)
  );
  const kibanaContext = useKibanaContext();

  const index = jobConfig.dest.index;
  const sourceIndex = jobConfig.source.index[0];
  const dependentVariable = getDependentVar(jobConfig.analysis);
  const predictionFieldName = getPredictionFieldName(jobConfig.analysis);
  // default is 'ml'
  const resultsField = jobConfig.dest.results_field;
  let requiresKeyword = false;

  const loadData = async ({
    isTrainingClause,
    ignoreDefaultQuery = true,
  }: {
    isTrainingClause: { query: string; operator: string };
    ignoreDefaultQuery?: boolean;
  }) => {
    setIsLoading(true);

    try {
      const indexPatternId = getIndexPatternIdFromName(sourceIndex) || sourceIndex;
      const indexPattern: IIndexPattern = await kibanaContext.indexPatterns.get(indexPatternId);

      if (indexPattern !== undefined) {
        await newJobCapsService.initializeFromIndexPattern(indexPattern, false, false);
        // If dependent_variable is of type keyword and text .keyword suffix is required for evaluate endpoint
        const { fields } = newJobCapsService;
        const depVarFieldType = fields.find(field => field.name === dependentVariable)?.type;

        // If it's a keyword type - check if it has a corresponding text type
        if (depVarFieldType !== undefined && depVarFieldType === ES_FIELD_TYPES.KEYWORD) {
          const field = newJobCapsService.getFieldById(dependentVariable.replace(/\.keyword$/, ''));
          requiresKeyword = field !== null && field.type === ES_FIELD_TYPES.TEXT;
        } else if (depVarFieldType !== undefined && depVarFieldType === ES_FIELD_TYPES.TEXT) {
          // If text, check if has corresponding keyword type
          const field = newJobCapsService.getFieldById(`${dependentVariable}.keyword`);
          requiresKeyword = field !== null && field.type === ES_FIELD_TYPES.KEYWORD;
        }
      }
    } catch (e) {
      // Additional error handling due to missing field type is handled by loadEvalData
      console.error('Unable to load new field types', error); // eslint-disable-line no-console
    }

    const evalData = await loadEvalData({
      isTraining: false,
      index,
      dependentVariable,
      resultsField,
      predictionFieldName,
      searchQuery,
      ignoreDefaultQuery,
      jobType: ANALYSIS_CONFIG_TYPE.CLASSIFICATION,
      requiresKeyword,
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

  const resizeHandler = () => {
    const tablePanelWidth: number =
      document.getElementById('mlDataFrameAnalyticsTableResultsPanel')?.clientWidth ||
      defaultPanelWidth;
    // Keep the evaluate panel width slightly smaller than the results table
    // to ensure results table can resize correctly. Temporary workaround DataGrid issue with flex
    const newWidth = tablePanelWidth - 8;
    setPanelWidth(newWidth);
  };

  useEffect(() => {
    window.addEventListener('resize', resizeHandler);
    resizeHandler();
    return () => {
      window.removeEventListener('resize', resizeHandler);
    };
  }, []);

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

          if (gridItem !== undefined) {
            const count = colId === gridItem.actual_class ? gridItem.count : gridItem.error_count;
            return `${count} / ${gridItem.actual_class_doc_count} * 100 = ${cellContentsElement.textContent}`;
          }

          return cellContentsElement.textContent;
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
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      setCellProps({
        style: {
          backgroundColor: `rgba(0, 179, 164, ${cellValue})`,
        },
      });
    }, [rowIndex, columnId, setCellProps]);
    return (
      <span>{typeof cellValue === 'number' ? `${Math.round(cellValue * 100)}%` : cellValue}</span>
    );
  };

  if (isLoading === true) {
    return <LoadingPanel />;
  }

  return (
    <EuiPanel style={{ width: `${panelWidth}px` }}>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <span>
                  {i18n.translate(
                    'xpack.ml.dataframe.analytics.classificationExploration.evaluateJobIdTitle',
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
            <EuiFlexItem>
              <EuiSpacer />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                target="_blank"
                iconType="help"
                iconSide="left"
                color="primary"
                href={`https://www.elastic.co/guide/en/machine-learning/${metadata.branch}/ml-dfanalytics-evaluate.html#ml-dfanalytics-classification`}
              >
                {i18n.translate(
                  'xpack.ml.dataframe.analytics.classificationExploration.classificationDocsLink',
                  {
                    defaultMessage: 'Classification evaluation docs ',
                  }
                )}
              </EuiButtonEmpty>
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
              <EuiFlexGroup gutterSize="xs">
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
                <EuiFlexItem grow={false}>
                  <EuiIconTip
                    anchorClassName="mlDataFrameAnalyticsClassificationInfoTooltip"
                    content={i18n.translate(
                      'xpack.ml.dataframe.analytics.classificationExploration.confusionMatrixTooltip',
                      {
                        defaultMessage:
                          'The multi-class confusion matrix contains the number of occurrences where the analysis classified data points correctly with their actual class as well as the number of occurrences where it misclassified them with another class',
                      }
                    )}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            {docsCount !== null && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  <FormattedMessage
                    id="xpack.ml.dataframe.analytics.classificationExploration.generalizationDocsCount"
                    defaultMessage="{docsCount, plural, one {# doc} other {# docs}} evaluated"
                    values={{ docsCount }}
                  />
                </EuiText>
              </EuiFlexItem>
            )}
            {/* BEGIN TABLE ELEMENTS */}
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" style={{ paddingLeft: '10%', paddingRight: '10%' }}>
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
                  {columns.length > 0 && columnsData.length > 0 && (
                    <Fragment>
                      <EuiFlexGroup direction="column" justifyContent="center" gutterSize="s">
                        <EuiFlexItem grow={false}>
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
