/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { EuiDataGridCellPopoverElementProps } from '@elastic/eui';
import { EuiCodeBlock } from '@elastic/eui';

import {
  type DataFrameAnalysisConfigType,
  type FeatureImportanceBaseline,
  type FeatureImportance,
  type TopClasses,
  ANALYSIS_CONFIG_TYPE,
  DEFAULT_RESULTS_FIELD,
} from '@kbn/ml-data-frame-analytics-utils';

import {
  getFeatureImportance,
  getTopClasses,
  type DataGridItem,
  type IndexPagination,
} from '@kbn/ml-data-grid';

import { DecisionPathPopover } from '../pages/analytics_exploration/components/feature_importance/decision_path_popover';

interface RenderCellPopoverFactoryOptions {
  analysisType?: DataFrameAnalysisConfigType | 'unknown';
  baseline?: FeatureImportanceBaseline;
  data: DataGridItem[];
  pagination: IndexPagination;
  predictionFieldName?: string;
  resultsField?: string;
}

export const renderCellPopoverFactory =
  ({
    analysisType,
    baseline,
    data,
    pagination,
    predictionFieldName,
    resultsField,
  }: RenderCellPopoverFactoryOptions) =>
  (popoverProps: EuiDataGridCellPopoverElementProps) => {
    const { schema, rowIndex, cellContentsElement, DefaultCellPopover } = popoverProps;
    if (
      analysisType === ANALYSIS_CONFIG_TYPE.REGRESSION ||
      analysisType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION ||
      analysisType === ANALYSIS_CONFIG_TYPE.OUTLIER_DETECTION
    ) {
      if (schema === 'featureImportance') {
        const row = data[rowIndex - pagination.pageIndex * pagination.pageSize];
        if (!row) return <div />;
        // if resultsField for some reason is not available then use ml
        const mlResultsField = resultsField ?? DEFAULT_RESULTS_FIELD;
        let predictedValue: string | number | undefined;
        let predictedProbability: number | undefined;
        let topClasses: TopClasses = [];
        if (
          predictionFieldName !== undefined &&
          row &&
          row[`${mlResultsField}.${predictionFieldName}`] !== undefined
        ) {
          predictedValue = row[`${mlResultsField}.${predictionFieldName}`];
          topClasses = getTopClasses(row, mlResultsField);
          predictedProbability = row[`${mlResultsField}.prediction_probability`];
        }

        const isClassTypeBoolean = topClasses.reduce(
          (p, c) => typeof c.class_name === 'boolean' || p,
          false
        );

        const parsedFIArray: FeatureImportance[] = getFeatureImportance(
          row,
          mlResultsField,
          isClassTypeBoolean
        );

        return (
          <div data-test-subj="mlDFAFeatureImportancePopover">
            <DecisionPathPopover
              analysisType={analysisType}
              predictedValue={predictedValue}
              predictedProbability={predictedProbability}
              baseline={baseline}
              featureImportance={parsedFIArray}
              topClasses={topClasses}
              predictionFieldName={
                predictionFieldName ? predictionFieldName.replace('_prediction', '') : undefined
              }
            />
          </div>
        );
      } else if (schema === 'featureInfluence') {
        return <EuiCodeBlock isCopyable={true}>{cellContentsElement.textContent}</EuiCodeBlock>;
      } else {
        return <DefaultCellPopover {...popoverProps} />;
      }
    } else {
      return <DefaultCellPopover {...popoverProps} />;
    }
  };
