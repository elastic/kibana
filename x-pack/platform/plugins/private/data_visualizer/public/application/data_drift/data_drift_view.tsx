/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { EuiEmptyPrompt, EuiFlexItem, EuiFormRow, EuiSwitch, EuiSpacer } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { WindowParameters } from '@kbn/aiops-log-rate-analysis';
import { i18n } from '@kbn/i18n';
import type { Query } from '@kbn/es-query';
import { ProgressControls } from '@kbn/aiops-components';
import { isEqual } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiSwitchEvent } from '@elastic/eui/src/components/form/switch/switch';
import { useTableState } from '@kbn/ml-in-memory-table';
import type { SearchQueryLanguage } from '@kbn/ml-query-utils';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { kbnTypeToSupportedType } from '../common/util/field_types_utils';
import {
  getDataComparisonType,
  type InitialSettings,
  useFetchDataComparisonResult,
} from './use_data_drift_result';
import type { DataDriftField, Feature, TimeRange } from './types';
import { DataDriftOverviewTable } from './data_drift_overview_table';
import { DataDriftPromptHint } from './data_drift_hint';

const showOnlyDriftedFieldsOptionLabel = i18n.translate(
  'xpack.dataVisualizer.dataDrift.showOnlyDriftedFieldsOptionLabel',
  { defaultMessage: 'Show only fields with drifted data' }
);

interface DataDriftViewProps {
  windowParameters?: WindowParameters;
  dataView: DataView;
  searchString: Query['query'];
  searchQueryLanguage: SearchQueryLanguage;
  isBrushCleared: boolean;
  runAnalysisDisabled?: boolean;
  onReset: () => void;
  lastRefresh: number;
  onRefresh: () => void;
  initialSettings: InitialSettings;
  hasValidTimeField: boolean;
}
// Data drift view
export const DataDriftView = ({
  windowParameters,
  dataView,
  searchString,
  searchQueryLanguage,
  onReset,
  isBrushCleared,
  lastRefresh,
  onRefresh,
  initialSettings,
  hasValidTimeField,
}: DataDriftViewProps) => {
  const [showDataComparisonOnly, setShowDataComparisonOnly] = useState(false);

  const [currentAnalysisWindowParameters, setCurrentAnalysisWindowParameters] = useState<
    WindowParameters | undefined
  >(windowParameters);

  const canAnalyzeDataDrift = useMemo(() => {
    return (
      !hasValidTimeField ||
      isPopulatedObject(windowParameters, [
        'baselineMin',
        'baselineMax',
        'deviationMin',
        'deviationMax',
      ])
    );
  }, [windowParameters, hasValidTimeField]);

  const [fetchInfo, setFetchIno] = useState<
    | {
        fields: DataDriftField[];
        currentDataView: DataView;
        timeRanges?: { reference: TimeRange; comparison: TimeRange };
      }
    | undefined
  >();

  const refresh = useCallback(() => {
    setCurrentAnalysisWindowParameters(windowParameters);
    const mergedFields: DataDriftField[] = [];
    if (dataView) {
      mergedFields.push(
        ...dataView.fields
          .filter(
            (f) =>
              f.aggregatable === true &&
              // @ts-ignore metadata does exist
              f.spec.metadata_field! !== true &&
              getDataComparisonType(f.type) !== 'unsupported' &&
              mergedFields.findIndex((merged) => merged.field === f.name) === -1
          )
          .map((f) => ({
            field: f.name,
            type: getDataComparisonType(f.type),
            secondaryType: kbnTypeToSupportedType(f),
            displayName: f.displayName,
          }))
      );
    }
    setFetchIno({
      fields: mergedFields,
      currentDataView: dataView,
      ...(windowParameters
        ? {
            timeRanges: {
              reference: {
                start: windowParameters.baselineMin,
                end: windowParameters.baselineMax,
              },
              comparison: {
                start: windowParameters.deviationMin,
                end: windowParameters.deviationMax,
              },
            },
          }
        : {}),
    });
    if (onRefresh) {
      onRefresh();
    }
  }, [dataView, windowParameters, onRefresh]);

  const { result, cancelRequest } = useFetchDataComparisonResult({
    ...fetchInfo,
    initialSettings,
    lastRefresh,
    searchString,
    searchQueryLanguage,
  });

  const filteredData = useMemo(() => {
    if (!result?.data) return [];

    switch (showDataComparisonOnly) {
      case true:
        return result.data.filter((d) => d.driftDetected === true);
      default:
        return result.data;
    }
  }, [result.data, showDataComparisonOnly]);

  const { onTableChange, pagination, sorting, setPageIndex } = useTableState<Feature>(
    filteredData,
    'driftDetected',
    'desc'
  );

  const shouldRerunAnalysis = useMemo(
    () =>
      currentAnalysisWindowParameters !== undefined &&
      !isEqual(currentAnalysisWindowParameters, windowParameters),
    [currentAnalysisWindowParameters, windowParameters]
  );

  const onShowDataComparisonOnlyToggle = (e: EuiSwitchEvent) => {
    setShowDataComparisonOnly(e.target.checked);
    setPageIndex(0);
  };

  const requiresWindowParameters = dataView?.isTimeBased() && windowParameters === undefined;

  const showRunAnalysisHint = result.status === 'not_initiated';

  if (requiresWindowParameters) {
    return (
      <EuiEmptyPrompt
        color="subdued"
        hasShadow={false}
        hasBorder={false}
        css={{ minWidth: '100%' }}
        title={
          <h2>
            <FormattedMessage
              id="xpack.dataVisualizer.dataDrift.emptyPromptTitle"
              defaultMessage="Click and select a time range for Reference and Comparison data in the histogram chart to compare data distribution."
            />
          </h2>
        }
        titleSize="xs"
        body={
          <p>
            <FormattedMessage
              id="xpack.dataVisualizer.dataDrift.emptyPromptBody"
              defaultMessage="The Data Drift Viewer visualizes changes in the model input data, which can lead to model performance degradation over time. Detecting data drifts enables you to identify potential performance issues."
            />
          </p>
        }
        data-test-subj="dataDriftNoWindowParametersEmptyPrompt"
      />
    );
  }
  if (showRunAnalysisHint) {
    return <DataDriftPromptHint refresh={refresh} canAnalyzeDataDrift={canAnalyzeDataDrift} />;
  }
  return (
    <div>
      <ProgressControls
        isBrushCleared={isBrushCleared}
        onReset={onReset}
        progress={result.loaded}
        progressMessage={result.progressMessage ?? ''}
        isRunning={result.loaded > 0 && result.loaded < 1}
        onRefresh={refresh}
        onCancel={cancelRequest}
        shouldRerunAnalysis={shouldRerunAnalysis}
        runAnalysisDisabled={!dataView || requiresWindowParameters}
      >
        <EuiFlexItem grow={false}>
          <EuiFormRow display="columnCompressed">
            <EuiSwitch
              label={showOnlyDriftedFieldsOptionLabel}
              aria-label={showOnlyDriftedFieldsOptionLabel}
              checked={showDataComparisonOnly}
              onChange={onShowDataComparisonOnlyToggle}
              compressed
            />
          </EuiFormRow>
        </EuiFlexItem>
      </ProgressControls>
      <EuiSpacer size="m" />

      {result.error ? (
        <EuiEmptyPrompt
          css={{ minWidth: '100%' }}
          color="danger"
          title={<h2>{result.error}</h2>}
          titleSize="xs"
          body={<span>{result.errorBody}</span>}
        />
      ) : (
        <DataDriftOverviewTable
          data={filteredData}
          onTableChange={onTableChange}
          pagination={pagination}
          sorting={sorting}
          setPageIndex={setPageIndex}
          status={result.status}
        />
      )}
    </div>
  );
};
